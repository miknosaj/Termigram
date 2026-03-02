import React, { useState } from "react";
import { Text, Box, useInput } from "ink";

const h = React.createElement;

export default function PinnedChats({ chats, onSelect, onBrowse }) {
    const [selected, setSelected] = useState(0);
    const items = [...chats, { title: "Browse all chats...", lastMessage: "view full conversation list" }];

    useInput((input, key) => {
        if (key.upArrow) {
            setSelected(prev => (prev - 1 + items.length) % items.length);
        }
        if (key.downArrow) {
            setSelected(prev => (prev + 1) % items.length);
        }
        if (key.return) {
            if (selected === chats.length) {
                onBrowse();
            } else {
                onSelect(chats[selected]);
            }
        }
    });

    return h(Box, { flexDirection: "column", marginTop: 1 },
        h(Text, { bold: true }, "  📌 Pinned Chats — jump in:"),
        h(Text, { color: "gray" }, "  ────────────────────────────────────────"),
        ...items.map((item, i) => {
            const isSelected = i === selected;
            const pointer = isSelected ? "  ❯ " : "    ";
            const label = item.title;

            return h(Box, { key: i },
                h(Text, { color: isSelected ? "#00b0ff" : undefined },
                    pointer,
                    h(Text, { bold: true }, label)
                )
            );
        }),
        h(Text, { color: "gray" }, "  ────────────────────────────────────────"),
        h(Text, { color: "gray" }, "  ↑↓ navigate  ⏎ select")
    );
}
