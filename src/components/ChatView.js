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

        // Detect list markers (e.g., "- ", "* ", "1. ") and leading spaces for hanging indents
        const match = para.match(/^(\s*(?:[-*•]|\d+\.)\s+|\s+)/);
        const prefix = match ? match[1] : "";
        const indentStr = " ".repeat(prefix.length);

        const content = para.substring(prefix.length);
        const words = content.split(/\s+/).filter(Boolean);

        if (words.length === 0) {
            lines.push(prefix);
            continue;
        }

        let line = prefix + words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            if (line.length + 1 + word.length > maxWidth) {
                lines.push(line);
                line = indentStr + word;
            } else {
                line += " " + word;
            }
        }
        lines.push(line);
    }
    return lines;
}

function stripMarkdown(text) {
    if (typeof text !== "string") return text;
    return text
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/(\*|_)(.*?)\1/g, "$2")
        .replace(/~~(.*?)~~/g, "$1")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/`(.*?)`/g, "$1");
}

function Message({ text, isSelf, contentWidth, replyTo, senderName, isGroup, showIndicator = true }) {
    const cleanText = stripMarkdown(text || "[media/unsupported]");

    // Indicator logic
    let indicatorChar = isSelf ? "●" : "○";
    let indicatorColor = isSelf ? "#00b0ff" : "white"; // Add Termigram blue to own messages
    let pad = "   "; // Match the spatial padding of " ○ " or " ● "

    // Group "Script" string overrides
    if (isGroup) {
        // e.g "Jason K.   " or "           "
        const formattedName = senderName || "Unknown";
        indicatorChar = isSelf ? " ".repeat(formattedName.length) : formattedName;
        indicatorColor = isSelf ? undefined : "cyan"; // Give group senders a distinct color
        pad = " ".repeat(formattedName.length + 2); // Name + " "
    }

    const lines = wrapText(cleanText, contentWidth - pad.length);

    const messageParts = [];

    if (replyTo) {
        const replyLines = wrapText(`┃ Replying to ${replyTo.sender || "Unknown"}: "${replyTo.text || "[Media]"}"`, contentWidth);
        replyLines.forEach((line, i) => {
            const drawIndicator = showIndicator && i === 0;
            messageParts.push(
                h(Text, { key: `reply-${i}`, color: "gray" },
                    drawIndicator ? " " : pad,
                    drawIndicator ? h(Text, { color: indicatorColor }, indicatorChar) : null,
                    drawIndicator ? " " : "",
                    line
                )
            );
        });
    }

    lines.forEach((line, i) => {
        const isFirst = i === 0 && !replyTo;
        const drawIndicator = showIndicator && isFirst;
        messageParts.push(
            h(Text, { key: `msg-${i}` },
                drawIndicator ? " " : pad,
                drawIndicator ? h(Text, { color: indicatorColor }, indicatorChar) : null,
                drawIndicator ? " " : "",
                line
            )
        );
    });

    return h(Box, { flexDirection: "column", marginBottom: 1 }, ...messageParts);
}

export default function ChatView({ title, messages, isTyping, isGroup, onSend, onCommand, onBack }) {
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
        ...messages.map((msg, i) => {
            const prevMsg = i > 0 ? messages[i - 1] : null;
            let showIndicator = true;
            if (prevMsg) {
                if (isGroup) {
                    showIndicator = prevMsg.senderName !== msg.senderName || prevMsg.isSelf !== msg.isSelf;
                } else {
                    showIndicator = prevMsg.isSelf !== msg.isSelf;
                }
            }

            return h(Message, {
                key: i,
                text: msg.text,
                isSelf: msg.isSelf,
                replyTo: msg.replyTo,
                senderName: msg.senderName, // Pass sender string for script padding
                isGroup,                    // Pass group explicitly
                contentWidth,
                showIndicator
            });
        }),
        h(InputPrompt, { onSubmit: handleSubmit, onBack, chatTitle: title, isTyping })
    );
}
