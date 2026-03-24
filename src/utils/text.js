/**
 * Text processing utilities for Termigram.
 * Pure functions — no React, no side effects.
 */

/**
 * Word-wrap text to fit within maxWidth columns.
 * Handles list markers, hanging indents, and words longer than the available width.
 */
export function wrapText(text, maxWidth) {
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

        // Handle single words that exceed maxWidth by chunking them
        const processedWords = [];
        for (const word of words) {
            if (word.length <= maxWidth - indentStr.length) {
                processedWords.push(word);
            } else {
                let remaining = word;
                while (remaining.length > 0) {
                    const chunkLength = maxWidth - indentStr.length;
                    if (chunkLength <= 0) {
                        processedWords.push(remaining.substring(0, 1));
                        remaining = remaining.substring(1);
                    } else {
                        processedWords.push(remaining.substring(0, chunkLength));
                        remaining = remaining.substring(chunkLength);
                    }
                }
            }
        }

        let line = prefix + processedWords[0];
        for (let i = 1; i < processedWords.length; i++) {
            const word = processedWords[i];
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

/**
 * Strip markdown formatting to get plain text (for width measurement).
 */
export function stripMarkdown(text) {
    if (typeof text !== "string") return text;
    return text
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/(\*|_)(.*?)\1/g, "$2")
        .replace(/~~(.*?)~~/g, "$1")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$2")
        .replace(/`(.*?)`/g, "$1");
}

/**
 * Return the message text, falling back to a descriptive label for media types.
 */
export function mediaFallbackText(msg) {
    const text = msg.text || "";
    if (text) return text;
    if (!msg.media) return "";

    const mc = msg.media.className;
    if (mc === "MessageMediaPhoto") return "[▣ Photo]";
    if (mc === "MessageMediaDocument") {
        const attrs = msg.media.document?.attributes || [];
        if (attrs.some(a => a.className === "DocumentAttributeAudio" && a.voice)) return "[◉ Voice]";
        if (attrs.some(a => a.className === "DocumentAttributeVideo")) return "[▶ Video]";
        if (attrs.some(a => a.className === "DocumentAttributeStickers" || a.className === "DocumentAttributeSticker")) return "[◈ Sticker]";
        return "[▤ Document]";
    }
    return "[◆ Media]";
}

/**
 * Compute how many terminal lines a message will occupy.
 * Must mirror the prefix/wrap logic used by the Message component.
 */
export function messageLineCount(msg, contentWidth, isGroup) {
    const clean = stripMarkdown(msg.text || "[media/unsupported]").replace(/\n+$/, "");
    const formattedName = msg.senderName || "Unknown";
    const prefixLength = isGroup ? formattedName.length + 2 : 2;
    const textLines = wrapText(clean, Math.max(1, contentWidth - prefixLength)).length;

    let replyLines = 0;
    if (msg.replyTo) {
        const replyStr = `╭ ${msg.replyTo.sender || "Unknown"}: "${msg.replyTo.text || "[Media]"}"`;
        replyLines = wrapText(replyStr, contentWidth).length;
    }

    return textLines + replyLines + 1; // +1 for marginBottom
}
