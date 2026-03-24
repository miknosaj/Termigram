#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./src/components/App.js";
import { disconnect } from "./src/telegram.js";
import { debug } from "./src/debug.js";

let exiting = false;

async function cleanup() {
    if (exiting) return;
    exiting = true;
    debug("Shutting down...");
    try {
        await disconnect();
    } catch (err) {
        debug("Error during disconnect:", err.message);
    }
    // Restore terminal title
    process.stdout.write(`\x1b]0;\x07`);
    console.clear();
    process.exit(0);
}

// Clean shutdown on Ctrl+C and termination signals
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

const app = render(React.createElement(App));
app.waitUntilExit().then(() => {
    cleanup();
});
