import React from "react";
import { Text, Box } from "ink";

const h = React.createElement;

const BANNER = [
    "  _______ ______ _      ______ _____ _____            __  __ ",
    " |__   __|  ____| |    |  ____/ ____|  __ \\     /\\   |  \\/  |",
    "    | |  | |__  | |    | |__ | |  __| |__) |   /  \\  | \\  / |",
    "    | |  |  __| | |    |  __|| | |_ |  _  /   / /\\ \\ | |\\/| |",
    "    | |  | |____| |____| |___| |__| | | \\ \\  / ____ \\| |  | |",
    "    |_|  |______|______|______\\_____|_|  \\_\\/_/    \\_\\_|  |_|",
];

export default function Banner({ phone }) {
    return h(Box, { flexDirection: "column", marginBottom: 1 },
        h(Box, { flexDirection: "column" },
            ...BANNER.map((line, i) =>
                h(Text, { key: i, color: "#1c64f2", bold: true }, line)
            )
        ),
        h(Box, { marginTop: 1, flexDirection: "column" },
            h(Text, { bold: true }, "  Logged in: ", phone),
            h(Text, { color: "gray" }, "  ────────────────────────────────────────"),
            h(Text, null, "  1. Use ", h(Text, { color: "#1c64f2" }, "/chats"), " to view your conversations."),
            h(Text, null, "  2. Use ", h(Text, { color: "#1c64f2" }, "/open <name>"), " to start chatting."),
            h(Text, null, "  3. Type ", h(Text, { color: "#1c64f2" }, "/help"), " for all commands.")
        )
    );
}
