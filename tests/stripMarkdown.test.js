import { describe, it, expect } from "vitest";
import { stripMarkdown } from "../src/utils/text.js";

describe("stripMarkdown", () => {
    it("strips bold (**text**)", () => {
        expect(stripMarkdown("hello **world**")).toBe("hello world");
    });

    it("strips bold (__text__)", () => {
        expect(stripMarkdown("hello __world__")).toBe("hello world");
    });

    it("strips italic (*text*)", () => {
        expect(stripMarkdown("hello *world*")).toBe("hello world");
    });

    it("strips italic (_text_)", () => {
        expect(stripMarkdown("hello _world_")).toBe("hello world");
    });

    it("strips strikethrough (~~text~~)", () => {
        expect(stripMarkdown("hello ~~world~~")).toBe("hello world");
    });

    it("strips inline code (`text`)", () => {
        expect(stripMarkdown("run `npm install`")).toBe("run npm install");
    });

    it("converts markdown links to bare URLs", () => {
        expect(stripMarkdown("[click here](https://example.com)")).toBe("https://example.com");
    });

    it("handles combined formatting", () => {
        expect(stripMarkdown("**bold** and *italic* and ~~struck~~")).toBe("bold and italic and struck");
    });

    it("returns non-string input unchanged", () => {
        expect(stripMarkdown(42)).toBe(42);
        expect(stripMarkdown(null)).toBe(null);
        expect(stripMarkdown(undefined)).toBe(undefined);
    });

    it("returns plain text unchanged", () => {
        expect(stripMarkdown("no formatting here")).toBe("no formatting here");
    });
});
