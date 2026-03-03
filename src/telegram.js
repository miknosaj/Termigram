import { loadConfig, saveEnv } from "./config.js";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import input from "input";

/**
 * Consolidated Telegram client wrapper.
 * Handles auth, sending, receiving, and fetching data.
 */

let client = null;
let me = null;

export async function connect() {
    const config = await loadConfig();
    const session = new StringSession(config.sessionString || "");

    client = new TelegramClient(session, Number(config.apiId), config.apiHash, {
        connectionRetries: 5,
    });
    client.setLogLevel("error");

    await client.start({
        phoneNumber: async () => await input.text("📱 Enter your phone number (with country code):"),
        phoneCode: async () => await input.text("💬 Enter the code you received:"),
        password: async () => await input.text("🔑 Enter your 2FA password:"),
        onError: (err) => { throw err; },
    });

    const savedSession = client.session.save();
    saveEnv({ SESSION_STRING: savedSession });

    me = await client.getMe();
    return { client, me };
}

export function getMe() {
    return me;
}

export function getClient() {
    return client;
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

export async function sendMessage(entity, text) {
    await client.sendMessage(entity, { message: text });
}

export function onNewMessage(callback) {
    client.addEventHandler(async (event) => {
        try {
            const message = event.message;
            if (!message) return;

            const parsed = await parseMessage(message);
            // Include chatId specific to the onNewMessage callback
            callback({
                chatId: message.chatId?.toString(),
                ...parsed,
            });
        } catch {
            // silently ignore
        }
    }, new NewMessage({}));
}

export function onTyping(callback) {
    client.addEventHandler((update) => {
        try {
            // UpdateUserTyping or UpdateChatUserTyping
            const className = update.className;
            if (className === "UpdateUserTyping" || className === "UpdateChatUserTyping") {
                const chatId = (update.chatId || update.userId)?.toString();
                if (chatId) callback(chatId);
            }
        } catch {
            // silently ignore
        }
    });
}

export async function findEntity(nameOrId) {
    for await (const dialog of client.iterDialogs({ limit: 50 })) {
        const title = dialog.title || "";
        const id = dialog.id?.toString();

        if (id === nameOrId) return { entity: dialog.entity, title };

        if (title.toLowerCase().includes(nameOrId.toLowerCase())) {
            return { entity: dialog.entity, title };
        }
    }
    return null;
}

export async function disconnect() {
    if (client) await client.disconnect();
}

export async function logout() {
    if (client) {
        try {
            await client.invoke(new Api.auth.LogOut());
        } catch (e) {
            // Ignore if already logged out
        }
        await client.disconnect();
    }
    saveEnv({ SESSION_STRING: "" });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseMessage(msg) {
    const senderName = await getSenderName(msg);
    let text = msg.text || "";

    // Media Fallbacks
    if (!text && msg.media) {
        if (msg.media.className === "MessageMediaPhoto") {
            text = "[▣ Photo]";
        } else if (msg.media.className === "MessageMediaDocument") {
            const attrs = msg.media.document?.attributes || [];
            const isVoice = attrs.some(a => a.className === "DocumentAttributeAudio" && a.voice);
            const isVideo = attrs.some(a => a.className === "DocumentAttributeVideo");
            const isSticker = attrs.some(a => a.className === "DocumentAttributeStickers" || a.className === "DocumentAttributeSticker");

            if (isVoice) text = "[◉ Voice]";
            else if (isVideo) text = "[▶ Video]";
            else if (isSticker) text = "[◈ Sticker]";
            else text = "[▤ Document]";
        } else {
            text = `[◆ Media]`;
        }
    }

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
        } catch (e) {
            // Ignore if we can't fetch reply
        }
    }

    return {
        id: msg.id,
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
    } catch {
        return "Unknown";
    }
}

