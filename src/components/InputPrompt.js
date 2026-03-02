import React, { useState, useEffect } from "react";
import { Text, Box, useInput, useStdout } from "ink";

const h = React.createElement;

function TypingDots() {
    const [frame, setFrame] = useState(0);
    const frames = ["·  ", "·· ", "···"];

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame(prev => (prev + 1) % frames.length);
        }, 400);
        return () => clearInterval(timer);
    }, []);

    return h(Text, { color: "#888888" }, " typing ", frames[frame]);
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
        if (key.return) {
            if (value.trim()) {
                onSubmit(value.trim());
            }
            setValue("");
            return;
        }
        if (key.backspace || key.delete) {
            setValue(prev => prev.slice(0, -1));
            return;
        }
        if (key.ctrl || key.meta) return;
        if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) return;
        if (key.tab) return;

        if (input) {
            setValue(prev => prev + input);
        }
    });

    const color = chatTitle ? "#00b0ff" : "#1c64f2";
    const placeholder = chatTitle
        ? `Type your message to ${chatTitle}`
        : "Type a command";

    return h(Box, { flexDirection: "column" },
        // Fixed-height typing slot — always 1 line tall
        h(Box, { height: 1 },
            isTyping
                ? h(TypingDots)
                : h(Text, null, " ")
        ),
        // Top divider
        h(Text, { color: "#444444" }, divider),
        // Input row
        h(Box, null,
            h(Text, { color }, " \u276f  "),
            value
                ? h(Text, null, value)
                : h(Text, { color: "#555555" }, placeholder)
        ),
        // Bottom divider
        h(Text, { color: "#444444" }, divider),
        // Status bar
        chatTitle
            ? h(Text, { color: "#555555" }, " esc back  \u00b7  /history  \u00b7  /quit")
            : null
    );
}
