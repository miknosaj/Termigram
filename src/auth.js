import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";
import { saveEnv } from "./config.js";
import { printInfo, printSuccess, printError } from "./ui.js";

/**
 * Create and authenticate a TelegramClient.
 * Returns the connected client instance.
 */
export async function authenticate({ apiId, apiHash, sessionString }) {
    const session = new StringSession(sessionString);

    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });

    // Suppress noisy internal logs
    client.setLogLevel("error");

    await client.start({
        phoneNumber: async () => await input.text("📱 Enter your phone number (with country code):"),
        phoneCode: async () => await input.text("💬 Enter the code you received:"),
        password: async () => await input.text("🔐 Enter your 2FA password:"),
        onError: (err) => {
            printError(`Auth error: ${err.message}`);
        },
    });

    // Persist the session so we don't need to re-auth next time
    const savedSession = client.session.save();
    saveEnv({ SESSION_STRING: savedSession });

    const me = await client.getMe();

    return { client, me };
}
