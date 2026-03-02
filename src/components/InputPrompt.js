import React, { useState, useEffect } from "react";
import { Text, Box, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";

const h = React.createElement;

function TypingDots() {
    const [frame, setFrame] = useState(0);
    const frames = ["   ", ".  ", ".. ", "..."];

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame(prev => (prev + 1) % frames.length);
        }, 250);
        return () => clearInterval(timer);
    }, []);

    return h(Text, { color: "#888888" }, " typing", frames[frame]);
}

export default function InputPrompt({ onSubmit, onBack, chatTitle, isTyping }) {
    const [value, setValue] = useState("");
    const { stdout } = useStdout();
    const cols = stdout.columns || 80;
    const divider = "\u2500".repeat(cols);

    useInput((input, key) => {
        if (key.escape) {
            if (onBack) onBack();
            return;
        }
    });

    const color = "#00b0ff";
    const nameColor = chatTitle ? "#888888" : "#00b0ff";
    const placeholder = "Type your message";

    return h(Box, { flexDirection: "column" },
        // Fixed-height typing slot — always 1 line tall
        h(Box, { height: 1 },
            isTyping
                ? h(TypingDots)
                : h(Text, { color: nameColor, bold: true }, chatTitle ? ` ${chatTitle}` : " ")
        ),
        // Top divider
        h(Text, { color: color }, divider),
        // Input row
        h(Box, { width: cols },
            h(Text, { color }, " ❯ "),
            h(Box, { flexGrow: 1, flexShrink: 1, paddingRight: 2 },
                h(TextInput, {
                    value,
                    onChange: setValue,
                    onSubmit: (val) => {
                        if (val.trim()) onSubmit(val.trim());
                        setValue("");
                    },
                    placeholder: value ? placeholder : ` ${placeholder}`
                })
            )
        ),
        // Bottom divider
        h(Text, { color: color }, divider),
        // Status bar
        chatTitle
            ? h(Text, { color: "#555555" }, " esc back    /history    /quit")
            : null
    );
}
