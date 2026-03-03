import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import * as tg from "../telegram.js";

const h = React.createElement;

export default function BrowseChats({ onSelect, onBack }) {
    const [chats, setChats] = useState([]);
    const [selected, setSelected] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const dialogs = await tg.getDialogs(50);
                setChats(dialogs);
                setLoading(false);
            } catch (err) {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (selected < offset) {
            setOffset(selected);
        } else if (selected >= offset + 10) {
            setOffset(selected - 9);
        }
    }, [selected, offset]);

    useInput((input, key) => {
        if (key.upArrow) {
            setSelected(prev => (prev - 1 + chats.length) % chats.length);
        }
        if (key.downArrow) {
            setSelected(prev => (prev + 1) % chats.length);
        }
        if (key.return) {
            if (chats.length > 0) {
                onSelect(chats[selected]);
            }
        }
        if (key.escape || input === "q") {
            onBack();
        }
    }, { isActive: !loading });

    if (loading) {
        return h(Text, { color: "gray" }, "  Loading chats...");
    }

    if (chats.length === 0) {
        return h(Text, { color: "gray" }, "  No chats found.");
    }

    return h(Box, {
        flexDirection: "column",
        borderStyle: "round",
        borderColor: "gray",
        paddingX: 2,
        paddingY: 1,
        marginTop: 1,
        marginLeft: 2,
        width: 50
    },
        h(Text, { bold: true, marginBottom: 1 }, "All Chats:"),
        offset > 0 ? h(Box, { paddingLeft: 2 }, h(Text, { color: "gray" }, "↑ Scroll up for more...")) : null,
        ...chats.slice(offset, offset + 10).map((chat, i) => {
            const actualIndex = offset + i;
            const isSelected = actualIndex === selected;
            const pointer = isSelected ? "❯ " : "  ";
            const label = chat.title;

            return h(Box, { key: actualIndex, paddingLeft: 2 },
                h(Text, { color: isSelected ? "#1c64f2" : undefined },
                    pointer,
                    h(Text, { bold: true }, label),
                    chat.unreadCount > 0 ? h(Text, { color: "#00E676" }, ` (${chat.unreadCount})`) : null
                )
            );
        }),
        chats.length > offset + 10 ? h(Box, { paddingLeft: 2 }, h(Text, { color: "gray" }, "↓ Scroll down for more...")) : null,
        h(Box, { marginTop: 1, paddingLeft: 2 },
            h(Text, { color: "gray" }, "↑↓ navigate  ⏎ select  esc back")
        )
    );
}
