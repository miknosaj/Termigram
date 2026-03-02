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
        h(Text, { bold: true, marginBottom: 1 }, "📌 Pinned Chats — jump in:"),
        ...items.map((item, i) => {
            const isSelected = i === selected;
            const pointer = isSelected ? "❯ " : "  ";
            const label = item.title;

            return h(Box, { key: i, paddingLeft: 2 },
                h(Text, { color: isSelected ? "#1c64f2" : undefined },
                    pointer,
                    h(Text, { bold: true }, label)
                )
            );
        }),
        h(Box, { marginTop: 1, paddingLeft: 2 },
            h(Text, { color: "gray" }, "↑↓ navigate  ⏎ select")
        )
    );
}
