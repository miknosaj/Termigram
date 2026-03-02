import React, { useState, useEffect } from "react";
import { Text, Box, useStdout } from "ink";
import InputPrompt from "./InputPrompt.js";

const h = React.createElement;

const GUTTER_WIDTH = 3; // " ❯ "
const MAX_CONTENT = 75;

function wrapText(text, maxWidth) {
    if (maxWidth < 10) maxWidth = 10;
    const paragraphs = text.split("\n");
    const lines = [];

    for (const para of paragraphs) {
        if (para.trim() === "") {
            lines.push("");
            continue;
        }
        const words = para.split(/\s+/).filter(Boolean);
        let line = "";
        for (const word of words) {
            if (line && line.length + 1 + word.length > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = line ? line + " " + word : word;
            }
        }
        if (line) lines.push(line);
    }
    return lines;
}

function Message({ text, isSelf, contentWidth }) {
    const color = isSelf ? "#00b0ff" : "#e05555";
    const lines = wrapText(text || "[media/unsupported]", contentWidth);
    const pad = " ".repeat(GUTTER_WIDTH);

    return h(Box, { flexDirection: "column", marginBottom: 1 },
        ...lines.map((line, i) =>
            h(Text, { key: i },
                i === 0 ? " " : pad,
                i === 0 ? h(Text, { color }, "❯") : null,
                i === 0 ? " " : "",
                line
            )
        )
    );
}

export default function ChatView({ title, messages, isTyping, onSend, onCommand, onBack }) {
    const { stdout } = useStdout();
    const [columns, setColumns] = useState(stdout.columns || 80);

    useEffect(() => {
        const onResize = () => setColumns(stdout.columns || 80);
        stdout.on("resize", onResize);
        return () => stdout.off("resize", onResize);
    }, [stdout]);

    const contentWidth = Math.min(MAX_CONTENT, Math.max(10, columns - GUTTER_WIDTH));

    const handleSubmit = async (text) => {
        if (text.startsWith("/")) {
            await onCommand(text);
        } else {
            await onSend(text);
        }
    };

    return h(Box, { flexDirection: "column" },
        ...messages.map((msg, i) =>
            h(Message, {
                key: i,
                text: msg.text,
                isSelf: msg.isSelf,
                contentWidth,
            })
        ),
        h(InputPrompt, { onSubmit: handleSubmit, onBack, chatTitle: title, isTyping })
    );
}
