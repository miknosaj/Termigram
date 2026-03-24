import { describe, it, expect } from "vitest";
import { wrapText } from "../src/utils/text.js";

describe("wrapText", () => {
    it("returns a single line for short text", () => {
        expect(wrapText("hello", 80)).toEqual(["hello"]);
    });

    it("wraps long text at word boundaries", () => {
        const lines = wrapText("the quick brown fox jumps over the lazy dog", 20);
        for (const line of lines) {
            expect(line.length).toBeLessThanOrEqual(20);
        }
        expect(lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
    });

    it("handles empty string", () => {
        expect(wrapText("", 80)).toEqual([""]);
    });

    it("preserves blank lines between paragraphs", () => {
        const lines = wrapText("hello\n\nworld", 80);
        expect(lines).toEqual(["hello", "", "world"]);
    });

    it("handles list markers with hanging indent", () => {
        const lines = wrapText("- this is a list item that should wrap with a hanging indent", 30);
        expect(lines[0]).toMatch(/^- /);
        // Continuation lines should be indented to match
        for (let i = 1; i < lines.length; i++) {
            expect(lines[i].startsWith("  ")).toBe(true); // 2 spaces = "- " length
        }
    });

    it("handles numbered list markers", () => {
        const lines = wrapText("1. this is a numbered list item that should wrap properly", 30);
        expect(lines[0]).toMatch(/^1\. /);
        for (let i = 1; i < lines.length; i++) {
            expect(lines[i].startsWith("   ")).toBe(true); // 3 spaces = "1. " length
        }
    });

    it("chunks words longer than maxWidth", () => {
        const longWord = "a".repeat(50);
        const lines = wrapText(longWord, 20);
        expect(lines.length).toBeGreaterThan(1);
        for (const line of lines) {
            expect(line.length).toBeLessThanOrEqual(20);
        }
        expect(lines.join("")).toBe(longWord);
    });

    it("enforces minimum width of 10", () => {
        const lines = wrapText("hello world", 3);
        // Should treat width as 10, not 3
        expect(lines).toEqual(["hello", "world"]);
    });

    it("handles multiline text with varying lengths", () => {
        const text = "short\nthis is a longer line that needs wrapping";
        const lines = wrapText(text, 20);
        expect(lines[0]).toBe("short");
        expect(lines.length).toBeGreaterThan(2);
    });

    it("handles text with unicode characters", () => {
        const lines = wrapText("hello 🌍 world", 80);
        expect(lines).toEqual(["hello 🌍 world"]);
    });
});
