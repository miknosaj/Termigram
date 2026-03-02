import React from "react";
import { Text, Box } from "ink";

const h = React.createElement;

export default function Banner({ phone }) {
    return h(Box, {
        flexDirection: "column",
        borderStyle: "round",
        borderColor: "#1c64f2",
        paddingX: 4,
        paddingY: 1,
        alignItems: "center",
        marginBottom: 1,
        marginLeft: 2,
        width: 50
    },
        h(Text, { color: "white", bold: true, marginBottom: 1 }, "╭─ Termigram ─╮"),

        h(Text, { bold: true }, "Welcome back!"),
        h(Text, { color: "gray", marginBottom: 1 }, phone),

        h(Box, { flexDirection: "column", alignItems: "flex-start" },
            h(Text, null, h(Text, { color: "#1c64f2" }, "↑↓"), " Navigate chats"),
            h(Text, null, h(Text, { color: "#1c64f2" }, "⏎"), " Open chat"),
            h(Text, null, h(Text, { color: "#1c64f2" }, "L"), " Log out"),
            h(Text, null, h(Text, { color: "#1c64f2" }, "q"), " Quit")
        )
    );
}
