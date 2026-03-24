import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import { COLOR_PRESETS, HISTORY_OPTIONS, saveSettings } from "../settings.js";

const h = React.createElement;

// ─── Grid Constants (shared with Dashboard) ──────────────────────────
const SIDEBAR_WIDTH = 26;
const PAD = 2;
const RULE_WIDTH = SIDEBAR_WIDTH - PAD * 2; // 22 chars

const SECTIONS = ["primaryColor", "historyCount", "showTimestamps"];
const LABELS = {
    primaryColor: "Primary Color",
    historyCount: "Message History",
    showTimestamps: "Show Timestamps"
};

export default function Settings({ columns = 80, rows = 24, settings, onSave, onBack }) {
    const [local, setLocal] = useState({ ...settings });
    const [section, setSection] = useState(0);
    const [customHexMode, setCustomHexMode] = useState(false);
    const [customHex, setCustomHex] = useState("");

    const currentSection = SECTIONS[section];
    const c = local.primaryColor;

    const update = (key, value) => {
        setLocal(prev => ({ ...prev, [key]: value }));
    };

    useInput((input, key) => {
        if (customHexMode) {
            if (key.escape) { setCustomHexMode(false); setCustomHex(""); return; }
            if (key.return) { handleCustomHexSubmit(customHex); return; }
            if (key.backspace || key.delete) { setCustomHex(prev => prev.slice(0, -1)); return; }
            if (input) { setCustomHex(prev => (prev + input).slice(0, 6)); }
            return;
        }

        if (key.escape) { saveSettings(local); onSave(local); onBack(); return; }
        if (key.upArrow) { setSection(prev => (prev - 1 + SECTIONS.length) % SECTIONS.length); }
        if (key.downArrow) { setSection(prev => (prev + 1) % SECTIONS.length); }

        if (currentSection === "primaryColor") {
            const idx = COLOR_PRESETS.findIndex(p => p.hex === local.primaryColor);
            if (key.leftArrow) { update("primaryColor", COLOR_PRESETS[(idx - 1 + COLOR_PRESETS.length) % COLOR_PRESETS.length].hex); }
            if (key.rightArrow) { update("primaryColor", COLOR_PRESETS[(idx + 1) % COLOR_PRESETS.length].hex); }
            if (input === "c" || input === "C") { setCustomHexMode(true); setCustomHex(""); }
        }
        if (currentSection === "historyCount") {
            const idx = HISTORY_OPTIONS.indexOf(local.historyCount);
            if (key.leftArrow && idx > 0) { update("historyCount", HISTORY_OPTIONS[idx - 1]); }
            if (key.rightArrow && idx < HISTORY_OPTIONS.length - 1) { update("historyCount", HISTORY_OPTIONS[idx + 1]); }
        }
        if (currentSection === "showTimestamps") {
            if (key.return || key.leftArrow || key.rightArrow) { update(currentSection, !local[currentSection]); }
        }
    });

    const handleCustomHexSubmit = (val) => {
        const cleaned = val.replace("#", "").trim();
        if (/^[0-9a-fA-F]{6}$/.test(cleaned)) { update("primaryColor", `#${cleaned}`); }
        setCustomHexMode(false);
        setCustomHex("");
    };

    // ─── Thin rule helper ────────────────────────────────────────────
    const rule = (width) => h(Text, { color: "gray", dimColor: true }, "─".repeat(width));

    // ─── Right column rule width ─────────────────────────────────────
    const rightInner = columns - SIDEBAR_WIDTH - PAD * 2 - 2;

    // ─── LEFT SIDEBAR ────────────────────────────────────────────────
    const sidebar = h(Box, {
        width: SIDEBAR_WIDTH,
        flexDirection: "column",
        paddingLeft: PAD,
        paddingRight: PAD
    },
        // Title + section menu anchored to top
        h(Box, { flexDirection: "column", marginBottom: 1 },
            h(Text, { color: c, bold: true }, "Settings"),
            rule(RULE_WIDTH)
        ),

        h(Box, { flexDirection: "column" },
            ...SECTIONS.map((sec, i) => {
                const active = section === i;
                return h(Text, {
                    key: sec,
                    bold: active,
                    color: active ? c : undefined
                }, active ? "❯ " : "  ", LABELS[sec]);
            })
        ),

        // Spacer pushes shortcuts to the bottom
        h(Box, { flexGrow: 1 }),

        // Shortcuts
        h(Box, { flexDirection: "column", flexShrink: 0 },
            rule(RULE_WIDTH),
            h(Text, { marginTop: 1 }, h(Text, { color: c }, "↑↓  "), "Navigate"),
            h(Text, null, h(Text, { color: c }, "←→  "), "Change"),
            h(Text, null, h(Text, { color: c }, "esc "), "Save & exit")
        )
    );

    // ─── RIGHT COLUMN ────────────────────────────────────────────────
    const rightRows = [];

    // Section title + rule (always present)
    rightRows.push(h(Text, { key: "title", bold: true }, LABELS[currentSection]));
    rightRows.push(h(Box, { key: "rule" }, rule(rightInner)));
    rightRows.push(h(Text, { key: "spacer" }, " "));

    if (currentSection === "primaryColor") {
        // Color swatches
        const swatchParts = [];
        COLOR_PRESETS.forEach((p, j) => {
            const isCurrent = local.primaryColor === p.hex;
            if (j > 0) swatchParts.push(h(Text, { key: `sp-${j}` }, " "));
            swatchParts.push(h(Text, { key: p.hex, color: p.hex, bold: isCurrent }, isCurrent ? `[${p.name}]` : p.name));
        });
        rightRows.push(h(Text, { key: "colors" }, ...swatchParts));
        rightRows.push(h(Text, { key: "spacer2" }, " "));

        if (customHexMode) {
            rightRows.push(h(Text, { key: "hex-input", color: "gray" },
                "Hex: #",
                h(Text, { color: "white" }, customHex),
                customHex.length < 6 ? h(Text, { inverse: true }, " ") : null
            ));
        } else {
            const isCustom = !COLOR_PRESETS.find(p => p.hex === local.primaryColor);
            rightRows.push(h(Text, { key: "hex-hint", color: "gray" },
                isCustom ? `Custom: ${local.primaryColor}  ` : "",
                "Press ", h(Text, { color: c }, "C"), " for custom hex"
            ));
        }
    } else if (currentSection === "historyCount") {
        rightRows.push(h(Text, { key: "desc", color: "gray" }, "Messages loaded when opening a chat"));
        rightRows.push(h(Text, { key: "spacer2" }, " "));

        const opts = HISTORY_OPTIONS.map(n => {
            const isCurrent = local.historyCount === n;
            return h(Text, { key: String(n), color: isCurrent ? c : "gray", bold: isCurrent },
                isCurrent ? `[${n}]` : ` ${n} `
            );
        });
        rightRows.push(h(Text, { key: "opts" }, ...opts));
    } else if (currentSection === "showTimestamps") {
        const val = local.showTimestamps;
        rightRows.push(h(Text, { key: "desc", color: "gray" }, "Display time next to each message"));
        rightRows.push(h(Text, { key: "spacer2" }, " "));
        rightRows.push(h(Text, { key: "toggle" },
            h(Text, { color: val ? c : "gray", bold: val }, val ? "[ON]" : " ON "),
            " ",
            h(Text, { color: !val ? c : "gray", bold: !val }, !val ? "[OFF]" : " OFF ")
        ));
    }

    const rightCol = h(Box, {
        flexDirection: "column",
        flexGrow: 1,
        paddingLeft: PAD,
        paddingRight: PAD
    }, ...rightRows);

    const panelHeight = Math.max(12, rows - 4);

    return h(Box, {
        width: columns,
        height: panelHeight,
        borderStyle: "round",
        borderColor: c,
        flexDirection: "row"
    }, sidebar, rightCol);
}
