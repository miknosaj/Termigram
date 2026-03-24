import React, { useState, useEffect } from "react";
import { Text, Box, useInput, useStdout } from "ink";

const h = React.createElement;

function TypingDots({ color }) {
    const [frame, setFrame] = useState(0);
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame(prev => (prev + 1) % frames.length);
        }, 100);
        return () => clearInterval(timer);
    }, []);

    return h(Box, { flexDirection: "row" },
        h(Box, { width: 2, flexShrink: 0 },
            h(Text, { color: "#888888" }, frames[frame])
        ),
        h(Text, { color }, "typing")
    );
}

export default function InputPrompt({ onSubmit, onBack, chatTitle, isTyping, primaryColor = "#00b0ff", onScrollUp, onScrollDown, columns }) {
    const [value, setValue] = useState("");
    const [cursor, setCursor] = useState(0); // Offset from the right end

    const { stdout } = useStdout();
    // Use the columns prop passed from the parent (debounced, consistent with layout).
    // Fall back to stdout.columns only if not provided.
    const cols = columns || stdout.columns || 80;
    const divider = "\u2500".repeat(cols);

    useInput((input, key) => {
        if (key.escape) {
            if (onBack) onBack();
            return;
        }

        if (key.return) {
            // Functional state updater — impossible to drop characters or read stale prop
            setValue(prev => {
                const trimmed = prev.trim();
                if (trimmed) onSubmit(trimmed);
                return "";
            });
            setCursor(0);
            return;
        }

        if (key.leftArrow) {
            setCursor(prev => prev + 1); // Render math clamps this safely
            return;
        }

        if (key.rightArrow) {
            setCursor(prev => Math.max(0, prev - 1));
            return;
        }

        if (key.backspace || key.delete) {
            setValue(prev => {
                const safeCursor = Math.min(Math.max(0, cursor), prev.length);
                if (safeCursor === prev.length) return prev; // Cannot backspace at the very beginning

                const deleteIdx = prev.length - safeCursor - 1;
                return prev.slice(0, deleteIdx) + prev.slice(deleteIdx + 1);
            });
            return;
        }

        if (key.upArrow) { if (onScrollUp) onScrollUp(); return; }
        if (key.downArrow) { if (onScrollDown) onScrollDown(); return; }

        // Ignore control codes
        if (key.ctrl || key.meta) return;

        if (input) {
            setValue(prev => {
                const safeCursor = Math.min(Math.max(0, cursor), prev.length);
                const insertIdx = prev.length - safeCursor;
                return prev.slice(0, insertIdx) + input + prev.slice(insertIdx);
            });
        }
    });

    const activeColor = primaryColor;
    const nameColor = chatTitle ? "#888888" : activeColor;
    const placeholder = "Type your message";

    const safeCursor = Math.min(Math.max(0, cursor), value.length);

    let renderedText;
    if (value.length === 0) {
        renderedText = h(Text, { color: "gray" },
            h(Text, { inverse: true }, placeholder[0] || " "),
            placeholder.slice(1)
        );
    } else {
        const insertIdx = value.length - safeCursor;
        const before = value.slice(0, insertIdx);
        // If cursor is 0 (far right), there is no char right of cursor, so use a space block
        const charAtCursor = safeCursor === 0 ? " " : value[insertIdx];
        const after = safeCursor === 0 ? "" : value.slice(insertIdx + 1);

        renderedText = h(Text, null,
            before,
            h(Text, { inverse: true }, charAtCursor),
            after
        );
    }

    return h(Box, { flexDirection: "column" },
        h(Box, { height: 1 },
            isTyping
                ? h(TypingDots, { color: nameColor })
                : h(Box, { flexDirection: "row" },
                    h(Box, { width: 2, flexShrink: 0 }, h(Text, null, "  ")),
                    h(Text, { color: nameColor, bold: true }, chatTitle ? chatTitle : "")
                )
        ),
        h(Text, { color: activeColor }, divider),
        h(Box, { width: cols },
            h(Text, { color: activeColor }, "❯ "),
            h(Box, { flexGrow: 1, flexShrink: 1, paddingRight: 2 }, renderedText)
        ),
        h(Text, { color: activeColor }, divider),
        chatTitle
            ? h(Box, { flexDirection: "row" },
                h(Box, { width: 2, flexShrink: 0 }, h(Text, null, "  ")),
                h(Text, { color: "#555555" }, "esc back    /history    /quit")
            )
            : null
    );
}
