import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Read version synchronously for immediate Boot UI render
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, "../../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const versionStr = `v${pkg.version}`;

const h = React.createElement;

// ─── Grid Constants ──────────────────────────────────────────────────
const SIDEBAR_WIDTH = 26;
const PAD = 2;
const RULE_WIDTH = SIDEBAR_WIDTH - PAD * 2; // 22 chars for thin rules

export default function Dashboard({ columns = 80, rows = 24, phone, masterList = [], loadingChats = false, primaryColor = "#00b0ff", onSelect }) {
    const c = primaryColor;

    const [selected, setSelected] = useState(0);
    const [offset, setOffset] = useState(0);

    const visibleItemCount = Math.max(3, rows - 10);

    useEffect(() => {
        if (selected < offset) setOffset(selected);
        else if (selected >= offset + visibleItemCount) setOffset(selected - visibleItemCount + 1);
    }, [selected, offset, visibleItemCount]);

    useInput((input, key) => {
        if (key.upArrow) setSelected(prev => (prev - 1 + masterList.length) % masterList.length);
        if (key.downArrow) setSelected(prev => (prev + 1) % masterList.length);
        if (key.return && masterList.length > 0) onSelect(masterList[selected]);
    }, { isActive: !loadingChats && masterList.length > 0 });

    // ─── Thin rule helper ────────────────────────────────────────────
    const rule = (width) => h(Text, { color: "gray", dimColor: true }, "─".repeat(width));

    // ─── Right column rule width (columns - outer borders - sidebar - divider - right col padding) ───
    const rightInner = columns - SIDEBAR_WIDTH - PAD * 2 - 3;

    // ─── LEFT SIDEBAR ────────────────────────────────────────────────
    const sidebar = h(Box, {
        width: SIDEBAR_WIDTH,
        flexDirection: "column",
        paddingLeft: PAD,
        paddingRight: PAD
    },
        // Identity block: brand + version + logged-in phone
        h(Box, { flexDirection: "column", marginBottom: 1 },
            h(Text, { color: c, bold: true }, "Termigram"),
            h(Text, { color: "gray" }, versionStr),
            h(Text, {}, phone)
        ),

        // Spacer pushes shortcuts to the bottom
        h(Box, { flexGrow: 1 }),

        // Shortcuts
        h(Box, { flexDirection: "column", flexShrink: 0 },
            rule(RULE_WIDTH),
            h(Text, { marginTop: 1 }, h(Text, { color: c }, "↑↓  "), "Navigate"),
            h(Text, null, h(Text, { color: c }, "⏎   "), "Open"),
            h(Text, null, h(Text, { color: c }, "S   "), "Settings"),
            h(Text, null, h(Text, { color: c }, "L   "), "Log out"),
            h(Text, null, h(Text, { color: c }, "Q   "), "Quit")
        )
    );

    // ─── RIGHT COLUMN ────────────────────────────────────────────────
    const rightCol = h(Box, {
        flexDirection: "column",
        flexGrow: 1,
        paddingLeft: PAD,
        paddingRight: PAD
    },
        h(Text, { bold: true }, "Conversations"),
        rule(rightInner),

        loadingChats
            ? h(Text, { color: "gray" }, "Syncing recent chats...")
            : null,

        masterList.length === 0 && !loadingChats
            ? h(Text, { color: "gray" }, "No chats found.")
            : null,

        ...masterList.slice(offset, offset + visibleItemCount).map((chat, i) => {
            const actualIndex = offset + i;
            const isSelected = actualIndex === selected;
            const isPinned = chat.pinned === true;
            const pointer = isSelected ? "❯ " : "  ";
            const pin = isPinned ? "✶ " : "  ";

            return h(Text, { key: actualIndex, color: isSelected ? c : undefined },
                pointer,
                pin,
                h(Text, { bold: isSelected || isPinned }, chat.title),
                chat.unreadCount > 0 ? h(Text, { color: "#00E676" }, ` (${chat.unreadCount})`) : null
            );
        }),

        // Scroll indicator
        h(Box, { flexGrow: 1 }),
        h(Box, { justifyContent: "space-between" },
            h(Text, { color: "gray" }, offset > 0 ? "↑ more" : ""),
            h(Text, { color: "gray" }, masterList.length > offset + visibleItemCount ? "↓ more" : "")
        )
    );

    const panelHeight = Math.max(12, rows - 4);

    // Explicit column of │ chars — more reliable than borderLeft on an empty Box
    const dividerLines = panelHeight - 2; // subtract outer border top + bottom
    const divider = h(Box, { flexShrink: 0 },
        h(Text, { color: "gray", dimColor: true }, Array(dividerLines).fill("│").join("\n"))
    );

    return h(Box, {
        width: columns,
        height: panelHeight,
        borderStyle: "round",
        borderColor: c,
        flexDirection: "row"
    }, sidebar, divider, rightCol);
}
