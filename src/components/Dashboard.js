import React, { useState, useEffect } from "react";
import { Text, Box, useInput, useStdout } from "ink";
import * as tg from "../telegram.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Read version synchronously for immediate Boot UI render
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, "../../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const versionStr = `v${pkg.version}-beta`;

const h = React.createElement;

export default function Dashboard({ phone, pinnedChats, onSelect, onBack }) {
    const { stdout } = useStdout();
    const [columns, setColumns] = useState(stdout.columns || 80);
    const [rows, setRows] = useState(stdout.rows || 24);

    const [allChats, setAllChats] = useState([]);
    const [loadingChats, setLoadingChats] = useState(true);

    // 0 = Pinned focus, 1 = All Chats focus (if we decide to implement tab shifting)
    // For simplicity right now, let's just merge them uniquely or just show all chats 
    // since the user wants a single unified screen.
    const [selected, setSelected] = useState(0);
    const [offset, setOffset] = useState(0);

    // Merge pinned and recent dialogs uniquely for the master list
    const [masterList, setMasterList] = useState([]);

    useEffect(() => {
        const onResize = () => {
            setColumns(stdout.columns || 80);
            setRows(stdout.rows || 24);
        };
        stdout.on("resize", onResize);
        return () => stdout.off("resize", onResize);
    }, [stdout]);

    useEffect(() => {
        (async () => {
            try {
                const dialogs = await tg.getDialogs(50);

                // Uniquely merge pinned and dialogs so pinned are at the top
                const pinnedIds = new Set(pinnedChats.map(c => c.id));
                const remaining = dialogs.filter(c => !pinnedIds.has(c.id));

                setMasterList([...pinnedChats, ...remaining]);
                setLoadingChats(false);
            } catch (err) {
                setLoadingChats(false);
            }
        })();
    }, [pinnedChats]);

    // Menu logic
    const visibleItemCount = Math.max(5, rows - 6); // adjust based on terminal height

    useEffect(() => {
        if (selected < offset) {
            setOffset(selected);
        } else if (selected >= offset + visibleItemCount) {
            setOffset(selected - visibleItemCount + 1);
        }
    }, [selected, offset, visibleItemCount]);

    useInput((input, key) => {
        if (key.upArrow) {
            setSelected(prev => (prev - 1 + masterList.length) % masterList.length);
        }
        if (key.downArrow) {
            setSelected(prev => (prev + 1) % masterList.length);
        }
        if (key.return) {
            if (masterList.length > 0) {
                onSelect(masterList[selected]);
            }
        }
        if (key.escape || input === "q") {
            onBack();
        }
    }, { isActive: !loadingChats && masterList.length > 0 });

    const sidebarWidth = 28;

    return h(Box, {
        width: columns,
        borderStyle: "round",
        borderColor: "#00b0ff",
        flexDirection: "row"
    },
        // Left Column: Identity & Navigation
        h(Box, {
            width: sidebarWidth,
            flexDirection: "column",
            paddingRight: 2,
            paddingLeft: 2,
            paddingTop: 1
        },
            h(Box, { flexDirection: "column", marginBottom: 1 },
                h(Text, { color: "#00b0ff", bold: true }, "Termigram"),
                h(Text, { color: "gray" }, versionStr)
            ),
            h(Box, { flexDirection: "column", marginBottom: 1 },
                h(Text, { color: "gray" }, "Account"),
                h(Text, { bold: true }, phone)
            ),
            h(Box, { flexDirection: "column", marginTop: 2, flexShrink: 0 },
                h(Text, { color: "gray", marginBottom: 1 }, "Shortcuts"),
                h(Box, null, h(Text, { color: "#00b0ff" }, "↑↓  "), h(Text, null, "Navigate")),
                h(Box, null, h(Text, { color: "#00b0ff" }, "⏎   "), h(Text, null, "Open")),
                h(Box, null, h(Text, { color: "#00b0ff" }, "L   "), h(Text, null, "Log out")),
                h(Box, null, h(Text, { color: "#00b0ff" }, "q   "), h(Text, null, "Quit"))
            )
        ),

        // Right Column: Chat Master List
        h(Box, {
            flexDirection: "column",
            flexGrow: 1,
            paddingLeft: 2,
            paddingTop: 1
        },
            h(Text, { bold: true, marginBottom: 1 }, "Conversations"),

            loadingChats && masterList.length === pinnedChats.length ?
                h(Text, { color: "gray" }, "Syncing recent chats...") : null,

            masterList.length === 0 && !loadingChats ?
                h(Text, { color: "gray" }, "No chats found.") : null,

            ...masterList.slice(offset, offset + visibleItemCount).map((chat, i) => {
                const actualIndex = offset + i;
                const isSelected = actualIndex === selected;
                const isPinned = pinnedChats.find(p => p.id === chat.id);

                const pointer = isSelected ? "❯ " : "  ";
                const pinIcon = isPinned ? "📌 " : "   ";
                const label = chat.title;

                return h(Box, { key: actualIndex },
                    h(Text, { color: isSelected ? "#00b0ff" : undefined },
                        pointer,
                        h(Text, { dimColor: !isPinned && !isSelected }, pinIcon),
                        h(Text, { bold: isSelected || isPinned }, label),
                        chat.unreadCount > 0 ? h(Text, { color: "#00E676" }, ` (${chat.unreadCount})`) : null
                    )
                );
            }),

            // Scroll indicators
            h(Box, { flexGrow: 1 }), // push indicators to bottom
            h(Box, { justifyContent: "space-between", marginTop: 1 },
                h(Text, { color: "gray" }, offset > 0 ? "↑ more" : ""),
                h(Text, { color: "gray" }, masterList.length > offset + visibleItemCount ? "↓ more" : "")
            )
        )
    );
}
