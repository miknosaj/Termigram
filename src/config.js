import dotenv from "dotenv";
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import input from "input";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env");

/**
 * Load config from .env, prompting interactively for any missing values.
 * Writes new values back to .env so subsequent runs are automatic.
 */
export async function loadConfig() {
  dotenv.config({ path: ENV_PATH });

  // Default Termigram Public API Keys
  const apiId = 2040; // Default Telegram Desktop ID
  const apiHash = "b18441a1ff607e10a989891a5462e627"; // Default Telegram Desktop Hash

  let sessionString = process.env.SESSION_STRING || "";

  return {
    apiId: parseInt(apiId, 10),
    apiHash,
    sessionString,
  };
}

/**
 * Update the .env file with new key-value pairs (merges with existing).
 */
export function saveEnv(updates) {
  let content = "";
  try {
    content = readFileSync(ENV_PATH, "utf-8");
  } catch {
    // file doesn't exist yet — that's fine
  }

  const lines = content.split("\n");
  const existing = {};

  for (const line of lines) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      existing[match[1]] = match[2];
    }
  }

  const merged = { ...existing, ...updates };
  const output = Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  writeFileSync(ENV_PATH, output + "\n", "utf-8");

  // Re-apply to process.env
  for (const [k, v] of Object.entries(updates)) {
    process.env[k] = v;
  }
}
