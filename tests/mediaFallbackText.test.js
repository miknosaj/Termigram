import { describe, it, expect } from "vitest";
import { mediaFallbackText } from "../src/utils/text.js";

describe("mediaFallbackText", () => {
    it("returns text when message has text", () => {
        expect(mediaFallbackText({ text: "hello" })).toBe("hello");
    });

    it("returns text even when media is present", () => {
        expect(mediaFallbackText({ text: "caption", media: { className: "MessageMediaPhoto" } })).toBe("caption");
    });

    it("returns empty string for no text and no media", () => {
        expect(mediaFallbackText({ text: "" })).toBe("");
        expect(mediaFallbackText({})).toBe("");
    });

    it("returns photo fallback", () => {
        expect(mediaFallbackText({ text: "", media: { className: "MessageMediaPhoto" } })).toBe("[▣ Photo]");
    });

    it("returns voice fallback", () => {
        const msg = {
            text: "",
            media: {
                className: "MessageMediaDocument",
                document: {
                    attributes: [{ className: "DocumentAttributeAudio", voice: true }],
                },
            },
        };
        expect(mediaFallbackText(msg)).toBe("[◉ Voice]");
    });

    it("returns video fallback", () => {
        const msg = {
            text: "",
            media: {
                className: "MessageMediaDocument",
                document: {
                    attributes: [{ className: "DocumentAttributeVideo" }],
                },
            },
        };
        expect(mediaFallbackText(msg)).toBe("[▶ Video]");
    });

    it("returns sticker fallback (DocumentAttributeSticker)", () => {
        const msg = {
            text: "",
            media: {
                className: "MessageMediaDocument",
                document: {
                    attributes: [{ className: "DocumentAttributeSticker" }],
                },
            },
        };
        expect(mediaFallbackText(msg)).toBe("[◈ Sticker]");
    });

    it("returns document fallback for generic documents", () => {
        const msg = {
            text: "",
            media: {
                className: "MessageMediaDocument",
                document: {
                    attributes: [{ className: "DocumentAttributeFilename" }],
                },
            },
        };
        expect(mediaFallbackText(msg)).toBe("[▤ Document]");
    });

    it("returns generic media fallback for unknown media types", () => {
        expect(mediaFallbackText({ text: "", media: { className: "MessageMediaGeo" } })).toBe("[◆ Media]");
    });

    it("handles document with no attributes array", () => {
        const msg = {
            text: "",
            media: {
                className: "MessageMediaDocument",
                document: {},
            },
        };
        expect(mediaFallbackText(msg)).toBe("[▤ Document]");
    });
});
