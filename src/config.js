import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadSettings, saveSettings } from "./settings.js";
import { debug } from "./debug.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEGACY_ENV_PATH = resolve(__dirname, "..", ".env");

// Default Termigram Public API Keys (Telegram Desktop)
const API_ID = 2040;
const API_HASH = "b18441a1ff607e10a989891a5462e627";

/**
 * Load config from ~/.termigram/config.json.
 * On first run, migrates SESSION_STRING from legacy .env if present.
 */
export function loadConfig() {
    const settings = loadSettings();

    // One-time migration: carry session from old .env → ~/.termigram/config.json
    if (!settings.sessionString) {
        const legacy = readLegacyEnv();
        if (legacy.SESSION_STRING) {
            settings.sessionString = legacy.SESSION_STRING;
            saveSettings(settings);
            wipeLegacySession();
        }
    }

    return {
        apiId: API_ID,
        apiHash: API_HASH,
        sessionString: settings.sessionString || "",
    };
}

function readLegacyEnv() {
    try {
        const content = readFileSync(LEGACY_ENV_PATH, "utf-8");
        const result = {};
        for (const line of content.split("\n")) {
            const m = line.match(/^([A-Z_]+)=(.*)$/);
            if (m) result[m[1]] = m[2];
        }
        return result;
    } catch (err) {
        debug("Could not read legacy .env:", err.message);
        return {};
    }
}

function wipeLegacySession() {
    try {
        const content = readFileSync(LEGACY_ENV_PATH, "utf-8");
        const filtered = content.split("\n")
            .filter(l => !l.startsWith("SESSION_STRING="))
            .join("\n");
        writeFileSync(LEGACY_ENV_PATH, filtered, "utf-8");
        debug("Wiped SESSION_STRING from legacy .env");
    } catch (err) {
        debug("Could not wipe legacy .env (may not exist):", err.message);
    }
}
