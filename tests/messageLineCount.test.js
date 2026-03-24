import { describe, it, expect } from "vitest";
import { messageLineCount } from "../src/utils/text.js";

describe("messageLineCount", () => {
    it("counts a simple short message as 2 lines (1 text + 1 margin)", () => {
        const msg = { text: "hello", senderName: "Alice", isSelf: false };
        // In 1:1 chat, prefix = 2 chars. "hello" fits easily in 80 cols.
        expect(messageLineCount(msg, 80, false)).toBe(2);
    });

    it("accounts for group chat sender name in prefix width", () => {
        const msg = { text: "hello", senderName: "Alice", isSelf: false };
        // Group prefix = "Alice" (5) + 2 = 7
        expect(messageLineCount(msg, 80, true)).toBe(2);
    });

    it("wraps long text and counts more lines", () => {
        const longText = "word ".repeat(30).trim(); // ~150 chars
        const msg = { text: longText, senderName: "Bob", isSelf: false };
        const count = messageLineCount(msg, 40, false);
        // With prefix=2, effective width=38. 150 chars / ~38 = ~4 lines + 1 margin
        expect(count).toBeGreaterThan(2);
    });

    it("adds reply lines when replyTo is present", () => {
        const msg = {
            text: "hello",
            senderName: "Alice",
            isSelf: false,
            replyTo: { sender: "Bob", text: "original message" },
        };
        const withReply = messageLineCount(msg, 80, false);
        const withoutReply = messageLineCount({ ...msg, replyTo: null }, 80, false);
        expect(withReply).toBeGreaterThan(withoutReply);
    });

    it("uses fallback text for empty/missing message text", () => {
        const msg = { text: "", senderName: "Alice", isSelf: false };
        // Falls back to "[media/unsupported]"
        expect(messageLineCount(msg, 80, false)).toBe(2);
    });

    it("uses 'Unknown' for missing sender name in group", () => {
        const msg = { text: "hello", isSelf: false };
        // senderName defaults to "Unknown" (7 chars), prefix = 9
        const count = messageLineCount(msg, 80, true);
        expect(count).toBe(2);
    });

    it("handles very narrow content width", () => {
        const msg = { text: "hello world", senderName: "A", isSelf: false };
        const count = messageLineCount(msg, 15, false);
        // wrapText clamps to min 10. With prefix=2, effective=13. "hello world"=11, fits in 1 line.
        expect(count).toBeGreaterThanOrEqual(2);
    });
});
