import React, { useState, useEffect, useRef } from "react";
import { Text, Box } from "ink";
import Link from "ink-link";
import InputPrompt from "./InputPrompt.js";
import { wrapText, stripMarkdown, messageLineCount } from "../utils/text.js";

const h = React.createElement;

const GUTTER_WIDTH = 2; // "❯ "
const MAX_CONTENT = 75;
const INPUT_AREA_ROWS = 5; // typing indicator + divider + input + divider + hint

// URL regex for detecting bare URLs
const URL_RE = /https?:\/\/[^\s)>\]]+/g;

// Render a plain string segment, converting bare URLs to clickable + underlined links
function renderSegment(str, keyPrefix) {
    const parts = [];
    let last = 0;
    let m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(str)) !== null) {
        if (m.index > last) {
            parts.push(h(Text, { key: `${keyPrefix}-${last}` }, str.slice(last, m.index)));
        }
        parts.push(h(Link, { key: `${keyPrefix}-u${m.index}`, url: m[0] },
            h(Text, { color: "#5c9eff", underline: true }, m[0])
        ));
        last = m.index + m[0].length;
    }
    if (last < str.length) {
        parts.push(h(Text, { key: `${keyPrefix}-${last}` }, str.slice(last)));
    }
    return parts.length > 0 ? parts : [str];
}

// Render rich text: **bold**, URLs as clickable links, strip other markdown
function renderRichText(text) {
    if (typeof text !== "string") return [text];

    // Strip strikethrough + inline code, convert markdown links to bare URLs
    let cleaned = text
        .replace(/~~(.*?)~~/g, "$1")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$2")   // show URL from markdown links
        .replace(/`(.*?)`/g, "$1");

    // Parse bold markers (**text** or __text__) into segments
    const parts = [];
    const boldRegex = /(\*\*|__)(.*?)\1/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(cleaned)) !== null) {
        if (match.index > lastIndex) {
            const before = cleaned.slice(lastIndex, match.index)
                .replace(/(\*|_)(.*?)\1/g, "$2");
            parts.push(...renderSegment(before, `t-${lastIndex}`));
        }
        parts.push(h(Text, { key: `b-${match.index}`, bold: true }, match[2]));
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleaned.length) {
        const remaining = cleaned.slice(lastIndex)
            .replace(/(\*|_)(.*?)\1/g, "$2");
        parts.push(...renderSegment(remaining, `t-${lastIndex}`));
    }

    if (parts.length === 0) {
        const stripped = cleaned.replace(/(\*|_)(.*?)\1/g, "$2");
        return renderSegment(stripped, "t-0");
    }

    return parts;
}

function Message({ text, date, isSelf, contentWidth, replyTo, senderName, isGroup, showIndicator = true, primaryColor = "#00b0ff", showTimestamps = false, outState, clipLines = 0, clipLinesBottom = 0, noMargin = false }) {
    let cleanText = stripMarkdown(text || "[media/unsupported]").replace(/\n+$/, "");

    if (showTimestamps && date) {
        const timeStr = new Date(date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        cleanText = `[${timeStr}] ${cleanText}`;
    }

    // Indicator logic
    let indicatorChar = "";
    let indicatorColor = undefined;
    let pad = "";

    if (isGroup) {
        // Group "Script" string overrides
        const formattedName = senderName || "Unknown";
        indicatorChar = isSelf ? " ".repeat(formattedName.length) : formattedName;
        indicatorColor = isSelf ? undefined : undefined; // Inherit text color
        pad = " ".repeat(formattedName.length + 2); // Name + " "
    } else {
        // 1:1 chat styling
        if (isSelf) {
            indicatorChar = "┃ ";
            indicatorColor = primaryColor;
            pad = ""; // We don't need secondary padding because the pipe goes on every line
        } else {
            indicatorChar = "";
            pad = "  ";
        }
    }

    const prefixLength = isGroup ? pad.length : 2;
    const lines = wrapText(cleanText, contentWidth - prefixLength);

    const messageParts = [];

    if (replyTo) {
        const replyLines = wrapText(`╭ ${replyTo.sender || "Unknown"}: "${replyTo.text || "[Media]"}"`, contentWidth);
        replyLines.forEach((line, i) => {
            const drawIndicator = isGroup ? (showIndicator && i === 0) : isSelf;
            const drawPad = isGroup ? !drawIndicator : !isSelf;

            messageParts.push(
                h(Text, { key: `reply-${i}`, color: isSelf && !isGroup ? primaryColor : "gray" },
                    drawPad ? pad : "",
                    drawIndicator ? h(Text, { color: indicatorColor }, indicatorChar) : null,
                    drawIndicator && isGroup ? " " : "",
                    line
                )
            );
        });
    }

    lines.forEach((line, i) => {
        const isFirst = i === 0 && !replyTo;
        const drawIndicator = isGroup ? (showIndicator && isFirst) : isSelf;
        const drawPad = isGroup ? !drawIndicator : !isSelf;

        let msgColor = isSelf && !isGroup ? primaryColor : undefined;
        let isDim = false;

        if (isSelf && outState === "pending") {
            isDim = true;
        } else if (isSelf && outState === "failed") {
            msgColor = "red";
        }

        messageParts.push(
            h(Text, { key: `msg-${i}`, color: msgColor, dimColor: isDim },
                drawPad ? pad : "",
                drawIndicator ? h(Text, { color: indicatorColor }, indicatorChar) : null,
                drawIndicator && isGroup ? " " : "",
                ...renderRichText(line),
                (isSelf && outState === "failed" && i === lines.length - 1) ? " [Failed]" : ""
            )
        );
    });

    const end = clipLinesBottom > 0 ? messageParts.length - clipLinesBottom : messageParts.length;
    const visibleParts = messageParts.slice(clipLines, end);
    if (visibleParts.length === 0) return null;
    return h(Box, { flexDirection: "column", marginBottom: noMargin ? 0 : 1 }, ...visibleParts);
}

export default function ChatView({ columns = 80, rows = 24, title, messages, isTyping, isGroup, primaryColor = "#00b0ff", showTimestamps = false, onSend, onCommand, onBack, onLoadMore, loadingMore = false }) {
    const [scrollLineOffset, setScrollLineOffset] = useState(0);

    const contentWidth = Math.min(MAX_CONTENT, Math.max(10, columns - GUTTER_WIDTH));

    // Pre-compute the terminal-row height of every message.
    // Margin (1 row) only appears when the next message is from a different sender —
    // consecutive same-sender messages are packed tight, blank line separates speakers.
    const senderChanges = (a, b) => isGroup
        ? b.senderName !== a.senderName || b.isSelf !== a.isSelf
        : b.isSelf !== a.isSelf;
    const messageHeights = messages.map((msg, i) => {
        const base = messageLineCount(msg, contentWidth, isGroup);
        const next = messages[i + 1];
        const hasMargin = !next || senderChanges(msg, next);
        return hasMargin ? base : base - 1;
    });

    const totalLines = messageHeights.reduce((a, b) => a + b, 0);

    // Two-pass viewport: first scan with a conservative height (2 indicator rows reserved)
    // to learn which indicators will actually render. Then rescan with the exact height
    // so the messages Box is sized to match perfectly — no rounding gaps.
    const sliceViewport = (height) => {
        const mlo = Math.max(0, totalLines - height);
        const elo = Math.min(scrollLineOffset, mlo);
        const vBot = totalLines - elo;
        const vTop = Math.max(0, vBot - height);
        let cum = 0;
        const items = [];
        for (let i = 0; i < messages.length; i++) {
            const t = cum, b = cum + messageHeights[i]; cum = b;
            if (b <= vTop) continue;
            if (t >= vBot) break;
            items.push({ msg: messages[i], msgIndex: i, clipTop: Math.max(0, vTop - t), clipBottom: Math.max(0, b - vBot) });
        }
        const older = items.length ? items[0].msgIndex : 0;
        const newer = items.length ? messages.length - items[items.length - 1].msgIndex - 1 : messages.length;
        return { maxLineOffset: mlo, effectiveLineOffset: elo, renderItems: items, olderCount: older, newerCount: newer };
    };

    // Pass 1: determine which indicators will show
    const p1 = sliceViewport(Math.max(1, rows - INPUT_AREA_ROWS - 2));
    const p1AtTop = p1.effectiveLineOffset >= p1.maxLineOffset && p1.maxLineOffset >= 0
        && p1.olderCount === 0 && messages.length > 0;
    const p1ShowTop = loadingMore || p1.olderCount > 0 || (p1AtTop && !!onLoadMore);
    const indicatorRows = (p1ShowTop ? 1 : 0) + (p1.newerCount > 0 ? 1 : 0);

    // Pass 2: exact height — messages Box height will match this exactly
    const messagesAreaHeight = Math.max(1, rows - INPUT_AREA_ROWS - indicatorRows);
    const { maxLineOffset, effectiveLineOffset, renderItems, olderCount, newerCount } = sliceViewport(messagesAreaHeight);

    // Refs so scroll callbacks always see current values without stale closures
    const maxLineOffsetRef = useRef(maxLineOffset);
    maxLineOffsetRef.current = maxLineOffset;
    const effectiveLineOffsetRef = useRef(effectiveLineOffset);
    effectiveLineOffsetRef.current = effectiveLineOffset;
    const onLoadMoreRef = useRef(onLoadMore);
    onLoadMoreRef.current = onLoadMore;
    const loadingMoreRef = useRef(loadingMore);
    loadingMoreRef.current = loadingMore;

    // When messages are prepended (load-more), adjust scrollLineOffset so the
    // viewport stays on the same visual content rather than jumping.
    const firstMsgIdRef = useRef(messages[0]?.id ?? null);
    useEffect(() => {
        if (!messages.length) { firstMsgIdRef.current = null; return; }
        const currFirstId = messages[0].id;
        if (firstMsgIdRef.current !== null && currFirstId !== firstMsgIdRef.current) {
            const oldFirstIdx = messages.findIndex(m => m.id === firstMsgIdRef.current);
            if (oldFirstIdx > 0) {
                const addedLines = messageHeights.slice(0, oldFirstIdx).reduce((a, b) => a + b, 0);
                setScrollLineOffset(prev => prev + addedLines);
            }
        }
        firstMsgIdRef.current = currFirstId;
    }, [messages]);

    const atTopOfLoaded = effectiveLineOffset >= maxLineOffset && maxLineOffset >= 0
        && olderCount === 0 && messages.length > 0;
    const showTopIndicator = loadingMore || olderCount > 0 || (atTopOfLoaded && onLoadMore);
    const topIndicatorText = loadingMore
        ? "  ○ Loading..."
        : olderCount > 0
            ? "  ↑ more above"
            : "  ↑ press ↑ for earlier messages";

    const handleSubmit = async (text) => {
        if (text.startsWith("/")) {
            await onCommand(text);
        } else {
            setScrollLineOffset(0); // snap to bottom on send
            await onSend(text);
        }
    };

    return h(Box, { flexDirection: "column", width: columns, height: rows },
        // Top indicator — anchored outside the messages box so it never shifts with content
        showTopIndicator
            ? h(Text, { color: "gray" }, topIndicatorText)
            : null,

        // Messages area — always flex-end (newest anchored to bottom, empty space at top).
        // messagesAreaHeight is computed from actual indicator count so the Box height
        // matches exactly — no rounding gap between the indicator and the first message.
        h(Box, { flexGrow: 1, flexDirection: "column", justifyContent: "flex-end" },
            ...renderItems.map(({ msg, msgIndex, clipTop, clipBottom }) => {
                const prevMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
                let showIndicator = true;
                if (prevMsg) {
                    if (isGroup) {
                        showIndicator = prevMsg.senderName !== msg.senderName || prevMsg.isSelf !== msg.isSelf;
                    } else {
                        showIndicator = prevMsg.isSelf !== msg.isSelf;
                    }
                }

                const nextMsg = messages[msgIndex + 1];
                const hasMargin = !nextMsg || senderChanges(msg, nextMsg);

                return h(Message, {
                    key: msgIndex,
                    text: msg.text,
                    date: msg.date,
                    isSelf: msg.isSelf,
                    replyTo: msg.replyTo,
                    senderName: msg.senderName,
                    isGroup,
                    contentWidth,
                    showIndicator,
                    primaryColor,
                    showTimestamps,
                    outState: msg.outState,
                    clipLines: clipTop,
                    clipLinesBottom: clipBottom,
                    noMargin: clipBottom > 0 || !hasMargin,
                });
            }),

        ),

        // Bottom indicator — anchored outside the messages box, just above input
        newerCount > 0
            ? h(Text, { color: "gray" }, `  ↓ ${newerCount} newer messages`)
            : null,

        // Input area — pinned at bottom, never compressed
        h(Box, { flexShrink: 0 },
            h(InputPrompt, {
                key: "input-prompt",
                columns,
                onSubmit: handleSubmit,
                onBack,
                chatTitle: title,
                isTyping,
                primaryColor,
                // Callbacks don't capture maxLineOffset — clamped at render via effectiveLineOffset.
                // Load more is triggered when already at the top of loaded history.
                onScrollUp: () => {
                    const elo = effectiveLineOffsetRef.current;
                    const mlo = maxLineOffsetRef.current;
                    if (elo >= mlo) {
                        // Already at top of loaded history — trigger load-more once and
                        // do NOT inflate scrollLineOffset (it is already clamped to mlo).
                        if (onLoadMoreRef.current && !loadingMoreRef.current) {
                            loadingMoreRef.current = true; // optimistic lock, synchronous
                            onLoadMoreRef.current();
                        }
                        return;
                    }
                    setScrollLineOffset(prev => Math.min(prev + 2, mlo));
                },
                onScrollDown: () => setScrollLineOffset(prev => Math.max(0, prev - 2)),
            })
        )
    );
}
