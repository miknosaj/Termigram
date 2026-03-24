import { createInterface } from "readline";
import { loadConfig } from "./config.js";
import { loadSettings, saveSettings } from "./settings.js";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { EditedMessage } from "telegram/events/EditedMessage.js";
import { debug } from "./debug.js";
import { mediaFallbackText } from "./utils/text.js";

function prompt(question) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Consolidated Telegram client wrapper.
 * Handles auth, sending, receiving, and fetching data.
 */

let client = null;
let me = null;

export async function connect() {
    const config = loadConfig();
    const session = new StringSession(config.sessionString || "");

    client = new TelegramClient(session, Number(config.apiId), config.apiHash, {
        connectionRetries: 5,
    });
    client.setLogLevel("error");

    await client.start({
        phoneNumber: async () => await prompt("📱 Enter your phone number (with country code): "),
        phoneCode: async () => await prompt("💬 Enter the code you received: "),
        password: async () => await prompt("🔑 Enter your 2FA password: "),
        onError: (err) => { throw err; },
    });

    const savedSession = client.session.save();
    saveSettings({ ...loadSettings(), sessionString: savedSession });

    me = await client.getMe();

    return { client, me };
}

export async function getPinnedChats() {
    const pinned = [];
    for await (const dialog of client.iterDialogs({ limit: 50 })) {
        if (dialog.pinned) {
            pinned.push({
                id: dialog.id?.toString(),
                title: dialog.title || "Unknown",
                entity: dialog.entity,
                lastMessage: dialog.message?.text || "",
            });
        }
    }
    return pinned;
}

export async function getDialogs(limit = 20) {
    const dialogs = [];
    for await (const dialog of client.iterDialogs({ limit })) {
        dialogs.push({
            id: dialog.id?.toString(),
            title: dialog.title || "Unknown",
            unreadCount: dialog.unreadCount || 0,
            lastMessage: dialog.message?.text || "",
            entity: dialog.entity,
        });
    }
    return dialogs;
}

export async function getHistory(entity, limit = 20) {
    const messages = [];
    for await (const msg of client.iterMessages(entity, { limit })) {
        messages.push(await parseMessage(msg));
    }
    return messages.reverse();
}

export async function sendMessage(entity, text, randomId) {
    return await client.sendMessage(entity, { message: text, randomId });
}

export async function markAsRead(entity) {
    try {
        await client.markAsRead(entity);
    } catch (err) {
        debug("markAsRead failed:", err.message);
    }
}

export function onNewMessage(callback) {
    client.addEventHandler((event) => {
        try {
            const message = event.message;
            if (!message) return;

            // CRITICAL: This handler MUST be synchronous.
            // GramJS awaits each event handler. If we do async work here
            // (like getSenderName or getReplyMessage), a single hung network
            // call will permanently block ALL future event delivery.

            const chatId = message.chatId?.toString();
            const isSelf = message.out === true;
            const text = mediaFallbackText(message);

            const basicMsg = {
                id: message.id,
                randomId: message.randomId ? message.randomId.toString() : undefined,
                chatId,
                text,
                date: message.date,
                senderName: isSelf ? "You" : "...",
                isSelf,
                replyTo: null,
            };

            // Deliver message to UI immediately with basic data
            callback(basicMsg);

            // Fire-and-forget async enrichment (sender name, reply info)
            // This does NOT block the GramJS event loop
            (async () => {
                try {
                    const senderName = await getSenderName(message);
                    let replyTo = null;
                    if (message.replyTo) {
                        try {
                            const replyMsg = await message.getReplyMessage();
                            if (replyMsg) {
                                const replySender = await getSenderName(replyMsg);
                                let replyText = replyMsg.text || "[Media]";
                                if (replyText.length > 40) replyText = replyText.substring(0, 40) + "...";
                                replyTo = { sender: replySender, text: replyText };
                            }
                        } catch (err) { debug("Reply enrichment failed:", err.message); }
                    }
                    callback({
                        ...basicMsg,
                        senderName,
                        replyTo,
                        _enrichment: true,
                    });
                } catch (err) { debug("Message enrichment failed:", err.message); }
            })();
        } catch (err) {
            debug("onNewMessage handler error:", err.message);
        }
    }, new NewMessage({}));
}

export function onEditedMessage(callback) {
    client.addEventHandler((event) => {
        try {
            const message = event.message;
            if (!message) return;

            const chatId = message.chatId?.toString();
            const isSelf = message.out === true;
            const text = mediaFallbackText(message);

            const updatedMsg = {
                id: message.id,
                chatId,
                text,
                date: message.date,
                senderName: isSelf ? "You" : "...",
                isSelf,
                replyTo: null,
                _edited: true,
            };

            // Deliver updated message immediately
            callback(updatedMsg);

            // Fire-and-forget async enrichment (sender name, reply info)
            (async () => {
                try {
                    const senderName = await getSenderName(message);
                    let replyTo = null;
                    if (message.replyTo) {
                        try {
                            const replyMsg = await message.getReplyMessage();
                            if (replyMsg) {
                                const replySender = await getSenderName(replyMsg);
                                let replyText = replyMsg.text || "[Media]";
                                if (replyText.length > 40) replyText = replyText.substring(0, 40) + "...";
                                replyTo = { sender: replySender, text: replyText };
                            }
                        } catch (err) { debug("Edit reply enrichment failed:", err.message); }
                    }
                    callback({
                        ...updatedMsg,
                        senderName,
                        replyTo,
                        _enrichment: true,
                    });
                } catch (err) { debug("Edit enrichment failed:", err.message); }
            })();
        } catch (err) {
            debug("onEditedMessage handler error:", err.message);
        }
    }, new EditedMessage({}));
}

export function onTyping(callback) {
    client.addEventHandler((update) => {
        try {
            const className = update.className;
            // Route each update type to the correct ID field
            if (className === "UpdateUserTyping") {
                const chatId = update.userId?.toString();
                const isTyping = update.action?.className !== "SendMessageCancelAction";
                if (chatId) callback(chatId, isTyping);
            } else if (className === "UpdateChatUserTyping") {
                const chatId = update.chatId?.toString();
                const isTyping = update.action?.className !== "SendMessageCancelAction";
                if (chatId) callback(chatId, isTyping);
            }
        } catch (err) {
            debug("onTyping handler error:", err.message);
        }
    });
}

export async function loadMoreHistory(entity, beforeId, limit = 20) {
    const messages = [];
    for await (const msg of client.iterMessages(entity, { limit, offsetId: beforeId })) {
        messages.push(await parseMessage(msg));
    }
    return messages.reverse();
}

export async function disconnect() {
    if (client) await client.disconnect();
}

export async function logout() {
    if (client) {
        try {
            await client.invoke(new Api.auth.LogOut());
        } catch (err) {
            debug("LogOut API call failed (may already be logged out):", err.message);
        }
        await client.disconnect();
    }
    saveSettings({ ...loadSettings(), sessionString: "" });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseMessage(msg) {
    const senderName = await getSenderName(msg);
    const text = mediaFallbackText(msg);

    // Reply Metadata
    let replyTo = null;
    if (msg.replyTo) {
        try {
            const replyMsg = await msg.getReplyMessage();
            if (replyMsg) {
                const replySender = await getSenderName(replyMsg);
                let replyText = replyMsg.text || "[Media]";
                if (replyText.length > 40) replyText = replyText.substring(0, 40) + "...";
                replyTo = { sender: replySender, text: replyText };
            }
        } catch (err) {
            debug("Failed to fetch reply message:", err.message);
        }
    }

    return {
        id: msg.id,
        randomId: msg.randomId ? msg.randomId.toString() : undefined,
        text,
        date: msg.date,
        senderName,
        isSelf: msg.out === true,
        replyTo,
    };
}

async function getSenderName(message) {
    try {
        const sender = await message.getSender();
        if (!sender) return "Unknown";
        if (sender.firstName) {
            return sender.lastName
                ? `${sender.firstName} ${sender.lastName}`
                : sender.firstName;
        }
        return sender.title || sender.username || "Unknown";
    } catch (err) {
        debug("getSenderName failed:", err.message);
        return "Unknown";
    }
}
