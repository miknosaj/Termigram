import { loadConfig, saveEnv } from "./config.js";
import { TelegramClient } from "telegram";
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
        const senderName = await getSenderName(msg);
        messages.push({
            text: msg.text || "",
            date: msg.date,
            senderName,
            isSelf: msg.out === true,
        });
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
            if (!message || !message.text) return;

            const senderName = await getSenderName(message);
            callback({
                chatId: message.chatId?.toString(),
                text: message.text,
                date: message.date,
                senderName,
                isSelf: message.out === true,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
