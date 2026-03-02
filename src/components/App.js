import React, { useState, useEffect } from "react";
import { Text, Box, useApp, useInput } from "ink";
import Banner from "./Banner.js";
import PinnedChats from "./PinnedChats.js";
import BrowseChats from "./BrowseChats.js";
import ChatView from "./ChatView.js";
import * as tg from "../telegram.js";

const h = React.createElement;

export default function App() {
    const app = useApp();
    const [screen, setScreen] = useState("loading");
    const [phone, setPhone] = useState("");
    const [pinnedChats, setPinnedChats] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);

    // ─── Boot ────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const { me } = await tg.connect();
                setPhone(me.phone || "Unknown");

                tg.onNewMessage((msg) => {
                    if (msg.isSelf) return;
                    setCurrentChat(prev => {
                        if (prev && msg.chatId === prev.id) {
                            setMessages(msgs => [...msgs, msg]);
                            setIsTyping(false); // clear typing when message arrives
                        }
                        return prev;
                    });
                });

                // Typing indicator
                let typingTimer = null;
                tg.onTyping((chatId) => {
                    setCurrentChat(prev => {
                        if (prev && chatId === prev.id) {
                            setIsTyping(true);
                            clearTimeout(typingTimer);
                            typingTimer = setTimeout(() => setIsTyping(false), 5000);
                        }
                        return prev;
                    });
                });

                const pinned = await tg.getPinnedChats();
                setPinnedChats(pinned);
                setScreen(pinned.length > 0 ? "menu" : "browse");
            } catch (err) {
                setError(err.message);
            }
        })();
    }, []);

    // ─── Open a chat ─────────────────────────────────────────────────
    const openChat = async (chat) => {
        setCurrentChat({ id: chat.id, title: chat.title, entity: chat.entity });
        process.stdout.write(`\x1b]0;${chat.title}\x07`);
        const history = await tg.getHistory(chat.entity, 20);
        setMessages(history);
        setScreen("chat");
    };

    // ─── Send message ────────────────────────────────────────────────
    const handleSend = async (text) => {
        if (!currentChat) return;
        setMessages(prev => [...prev, { text, isSelf: true, senderName: "You" }]);
        await tg.sendMessage(currentChat.entity, text);
    };

    // ─── Go back to menu ──────────────────────────────────────────────
    const goBack = () => {
        setCurrentChat(null);
        setMessages([]);
        process.stdout.write(`\x1b]0;Termigram\x07`);
        setScreen("menu");
    };

    // ─── Handle commands ─────────────────────────────────────────────
    const handleCommand = async (cmd) => {
        const [command, ...args] = cmd.split(/\s+/);
        const arg = args.join(" ");

        try {
            switch (command.toLowerCase()) {
                case "/back":
                    goBack();
                    break;
                case "/history": {
                    const n = parseInt(arg) || 20;
                    if (currentChat) {
                        const history = await tg.getHistory(currentChat.entity, n);
                        setMessages([...history]); // fresh array reference
                    }
                    break;
                }
                case "/exit":
                case "/quit":
                    await tg.disconnect();
                    app.exit();
                    break;
            }
        } catch (err) {
            setError(`Command failed: ${err.message}`);
        }
    };

    // ─── Ctrl+C / q to quit from non-chat screens ───────────────────
    useInput((input, key) => {
        if (input === "q" && screen !== "chat") {
            tg.disconnect().then(() => {
                app.exit();
            });
        }
    }, { isActive: screen !== "chat" });

    // ─── Render ──────────────────────────────────────────────────────
    if (error) {
        return h(Text, { color: "red" }, "  ✖  Error: ", error);
    }

    if (screen === "loading") {
        return h(Box, { flexDirection: "column" },
            h(Banner, { phone: "connecting..." }),
            h(Text, { color: "#1c64f2" }, "  ⏳ Connecting to Telegram...")
        );
    }

    if (screen === "menu") {
        return h(Box, { flexDirection: "column" },
            h(Banner, { phone }),
            pinnedChats.length > 0
                ? h(PinnedChats, {
                    chats: pinnedChats,
                    onSelect: openChat,
                    onBrowse: () => setScreen("browse")
                })
                : null
        );
    }

    if (screen === "chat") {
        return h(ChatView, {
            title: currentChat.title,
            messages,
            isTyping,
            onSend: handleSend,
            onCommand: handleCommand,
            onBack: goBack,
        });
    }

    if (screen === "browse") {
        return h(Box, { flexDirection: "column" },
            h(Banner, { phone }),
            h(BrowseChats, {
                onSelect: openChat,
                onBack: () => {
                    if (pinnedChats.length > 0) setScreen("menu");
                }
            })
        );
    }

    return null;
}
