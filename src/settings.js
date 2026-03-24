import fs from "fs";
import path from "path";
import os from "os";
import { debug } from "./debug.js";

const CONFIG_DIR = path.join(os.homedir(), ".termigram");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULTS = {
    primaryColor: "#00b0ff",
    historyCount: 20,
    showTimestamps: false,
    sessionString: ""
};

export const COLOR_PRESETS = [
    { name: "Ocean", hex: "#00b0ff" },
    { name: "Emerald", hex: "#00E676" },
    { name: "Violet", hex: "#9C27B0" },
    { name: "Amber", hex: "#FFB300" },
    { name: "Rose", hex: "#FF5252" },
    { name: "White", hex: "#FFFFFF" }
];

export const HISTORY_OPTIONS = [10, 20, 50, 100];

/**
 * Ensure ~/.termigram/ exists with mode 0700
 * and fix permissions if the directory already exists with looser perms.
 */
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
        debug("Created config dir", CONFIG_DIR, "with mode 0700");
    } else {
        // Fix permissions on existing directory if too open
        try {
            const stat = fs.statSync(CONFIG_DIR);
            const mode = stat.mode & 0o777;
            if (mode !== 0o700) {
                fs.chmodSync(CONFIG_DIR, 0o700);
                debug("Fixed config dir permissions from", mode.toString(8), "to 0700");
            }
        } catch (err) {
            debug("Could not check/fix config dir permissions:", err.message);
        }
    }
}

export function loadSettings() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
            const saved = JSON.parse(raw);
            return { ...DEFAULTS, ...saved };
        }
    } catch (err) {
        debug("Failed to load settings:", err.message);
    }
    return { ...DEFAULTS };
}

export function saveSettings(settings) {
    try {
        ensureConfigDir();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), {
            encoding: "utf-8",
            mode: 0o600,
        });
        debug("Saved settings to", CONFIG_FILE);
    } catch (err) {
        debug("Failed to save settings:", err.message);
    }
}
