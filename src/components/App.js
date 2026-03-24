import React, { useState, useEffect, useRef } from "react";
import { Text, useApp, useInput, useStdout } from "ink";
import Dashboard from "./Dashboard.js";
import ChatView from "./ChatView.js";
import Settings from "./Settings.js";
import * as tg from "../telegram.js";
import { loadSettings } from "../settings.js";
import { debug } from "../debug.js";
const h = React.createElement;

export default function App() {
    const app = useApp();
    const { stdout } = useStdout();
    const [columns, setColumns] = useState(stdout.columns || 80);
    const [rows, setRows] = useState(stdout.rows || 24);
    const [screen, setScreen] = useState("loading");
    const [phone, setPhone] = useState("");
    const typingTimer = useRef(null);
    const [masterList, setMasterList] = useState([]);
    const [loadingChats, setLoadingChats] = useState(true);
    const [currentChat, setCurrentChat] = useState(null);
    const currentChatRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const [settings, setSettings] = useState(loadSettings());
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreLockRef = useRef(false);
    const openingChatRef = useRef(false);

    // Keep ref in sync with state so event handlers always read the latest value
    useEffect(() => {
        currentChatRef.current = currentChat;
    }, [currentChat]);

    // ─── Debounced resize: clear screen + update dimensions ──────────
    const resizeTimer = useRef(null);
    useEffect(() => {
        const onResize = () => {
            clearTimeout(resizeTimer.current);
            resizeTimer.current = setTimeout(() => {
                process.stdout.write("\x1b[2J\x1b[H");
                setColumns(stdout.columns || 80);
                setRows(stdout.rows || 24);
            }, 150);
        };
        stdout.on("resize", onResize);
        return () => {
            stdout.off("resize", onResize);
            clearTimeout(resizeTimer.current);
        };
    }, [stdout]);

    // ─── Boot ────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const { me } = await tg.connect();
                setPhone(me.phone || "Unknown");

                tg.onNewMessage((msg) => {
                    const chat = currentChatRef.current;

                    // Message for the currently open chat
                    if (chat && msg.chatId === chat.id) {
                        // Enrichment update — update an existing message in place
                        if (msg._enrichment) {
                            setMessages(msgs => msgs.map(m => m.id === msg.id ? { ...m, senderName: msg.senderName, replyTo: msg.replyTo } : m));
                            return;
                        }

                        setMessages(msgs => {
                            // Reconcile optimistic self-sent messages via randomId
                            if (msg.isSelf && msg.randomId) {
                                const exists = msgs.some(m => m.randomId === msg.randomId);
                                if (exists) {
                                    return msgs.map(m => m.randomId === msg.randomId ? { ...msg, outState: "sent" } : m);
                                }
                            }

                            // Prevent duplicates
                            if (msg.id !== undefined && msgs.some(m => m.id === msg.id)) return msgs;

                            if (!msg.isSelf) {
                                setIsTyping(false);
                                tg.markAsRead(chat.entity);
                            }
                            return [...msgs, msg];
                        });
                        return;
                    }

                    // Message for a background chat — increment its unread badge
                    if (msg._enrichment) return; // enrichment for non-open chats is irrelevant
                    if (msg.isSelf) return;       // own messages don't add unread

                    setMasterList(prev => prev.map(c =>
                        c.id === msg.chatId
                            ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: msg.text }
                            : c
                    ));
                });

                // Edited messages (streaming bots, manual edits, etc.)
                tg.onEditedMessage((msg) => {
                    const chat = currentChatRef.current;

                    // Only process edits for the currently open chat
                    if (!chat || msg.chatId !== chat.id) return;

                    // Enrichment update — just update sender/reply metadata
                    if (msg._enrichment) {
                        setMessages(msgs => msgs.map(m =>
                            m.id === msg.id ? { ...m, senderName: msg.senderName, replyTo: msg.replyTo } : m
                        ));
                        return;
                    }

                    // Replace the message text (and other fields) in-place by matching on id
                    setMessages(msgs => msgs.map(m =>
                        m.id === msg.id
                            ? { ...m, text: msg.text, date: msg.date, _edited: true }
                            : m
                    ));
                });

                // Typing indicator
                tg.onTyping((chatId, isTypingStatus) => {
                    const chat = currentChatRef.current;
                    if (!chat || chatId !== chat.id) return;

                    setIsTyping(isTypingStatus);
                    clearTimeout(typingTimer.current);
                    if (isTypingStatus) {
                        typingTimer.current = setTimeout(() => setIsTyping(false), 10000);
                    }
                });

                // Build initial master list: pinned chats first, then remaining dialogs
                const pinned = await tg.getPinnedChats();
                const dialogs = await tg.getDialogs(50);
                const pinnedIds = new Set(pinned.map(c => c.id));
                const pinnedMarked = pinned.map(c => ({ ...c, pinned: true }));
                const remaining = dialogs.filter(c => !pinnedIds.has(c.id));
                setMasterList([...pinnedMarked, ...remaining]);
                setLoadingChats(false);
                setScreen("dashboard");
            } catch (err) {
                setError(err.message);
            }
        })();
    }, []);

    // ─── Load earlier messages ───────────────────────────────────────
    const loadMoreMessages = async () => {
        if (!currentChat || loadingMoreLockRef.current || messages.length === 0) return;
        loadingMoreLockRef.current = true; // synchronous lock — prevents stale-closure double-calls
        setLoadingMore(true);
        try {
            const oldest = messages[0];
            const more = await tg.loadMoreHistory(currentChat.entity, oldest.id, settings.historyCount);
            if (more.length > 0) {
                setMessages(prev => [...more.filter(m => !prev.some(p => p.id === m.id)), ...prev]);
            }
        } catch (err) { debug("loadMoreMessages failed:", err.message); } finally {
            loadingMoreLockRef.current = false;
            setLoadingMore(false);
        }
    };

    // ─── Open a chat ─────────────────────────────────────────────────
    const openChat = async (chat) => {
        if (openingChatRef.current) return; // prevent concurrent opens
        openingChatRef.current = true;

        setIsTyping(false);
        setCurrentChat({ id: chat.id, title: chat.title, entity: chat.entity });
        process.stdout.write(`\x1b]0;${chat.title}\x07`);
        setMasterList(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));

        try {
            const history = await tg.getHistory(chat.entity, settings.historyCount);
            setMessages(history);
            setScreen("chat");
            tg.markAsRead(chat.entity);
        } catch (err) {
            // Revert: clear currentChat and restore unread count from masterList
            setCurrentChat(null);
            setError(`Failed to open chat: ${err.message}`);
        } finally {
            openingChatRef.current = false;
        }
    };

    // ─── Send message ────────────────────────────────────────────────
    const handleSend = async (text) => {
        if (!currentChat) return;

        // Generate robust 64-bit random ID
        const randomIdStr = Date.now().toString() + Math.floor(Math.random() * 1e5).toString();
        const msgRandomId = BigInt(randomIdStr);

        const optimisticMsg = {
            id: `temp-${randomIdStr}`,
            randomId: randomIdStr,
            text,
            isSelf: true,
            senderName: "You",
            outState: "pending",
            date: Math.floor(Date.now() / 1000)
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            await tg.sendMessage(currentChat.entity, text, msgRandomId);
            setMessages(prev => prev.map(m => m.randomId === randomIdStr ? { ...m, outState: "sent" } : m));
        } catch (_err) {
            setMessages(prev => prev.map(m => m.randomId === randomIdStr ? { ...m, outState: "failed" } : m));
        }
    };

    // ─── Go back to menu ──────────────────────────────────────────────
    const goBack = () => {
        setIsTyping(false);
        setCurrentChat(null);
        setMessages([]);
        process.stdout.write(`\x1b]0;Termigram\x07`);
        setScreen("dashboard");
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
                    const n = parseInt(arg) || settings.historyCount;
                    if (currentChat) {
                        const history = await tg.getHistory(currentChat.entity, n);
                        setMessages([...history]);
                    }
                    break;
                }
                case "/exit":
                case "/quit":
                    await tg.disconnect();
                    app.exit();
                    break;
                case "/logout":
                    await tg.logout();
                    app.exit();
                    break;
                default:
                    setError(`Unknown command: ${command}`);
            }
        } catch (err) {
            setError(`Command failed: ${err.message}`);
        }
    };

    // ─── Keyboard shortcuts (dashboard only) ─────────────────────────
    useInput((input, _key) => {
        if (input.toLowerCase() === "l") {
            tg.logout().then(() => app.exit());
            return;
        }
        if (input.toLowerCase() === "s") {
            setScreen("settings");
            return;
        }
        if (input.toLowerCase() === "q") {
            tg.disconnect().then(() => app.exit());
        }
    }, { isActive: screen === "dashboard" });

    // ─── Error recovery ──────────────────────────────────────────────
    useInput((input, _key) => {
        if (input?.toLowerCase() === "q") {
            tg.disconnect().then(() => app.exit());
            return;
        }
        // Clear the error and go back to a usable screen
        setError(null);
        if (screen === "loading") {
            // Never got past loading — not much we can do without a re-connect flow
            tg.disconnect().then(() => app.exit());
        } else {
            setScreen("dashboard");
        }
    }, { isActive: !!error });

    // ─── Render ──────────────────────────────────────────────────────
    if (error) {
        return h(Text, null,
            h(Text, { color: "red" }, "  ✕  Error: ", error), "\n",
            h(Text, { color: "gray" }, "  Press any key to return to dashboard, or Q to quit")
        );
    }

    if (screen === "loading") {
        return h(Text, { color: settings.primaryColor }, "  ○ Connecting to Telegram...");
    }

    if (screen === "settings") {
        return h(Settings, {
            columns,
            rows,
            settings,
            onSave: (updated) => setSettings(updated),
            onBack: () => setScreen("dashboard")
        });
    }

    if (screen === "dashboard") {
        return h(Dashboard, {
            columns,
            rows,
            phone,
            masterList,
            loadingChats,
            primaryColor: settings.primaryColor,
            onSelect: openChat,
        });
    }

    if (screen === "chat") {
        const isGroup = currentChat.entity &&
            (currentChat.entity.className === "Chat" || currentChat.entity.className === "Channel");

        return h(ChatView, {
            key: currentChat.id,
            columns,
            rows,
            loadingMore,
            onLoadMore: loadMoreMessages,
            title: currentChat.title,
            messages,
            isTyping,
            isGroup,
            primaryColor: settings.primaryColor,
            showTimestamps: settings.showTimestamps,
            onSend: handleSend,
            onCommand: handleCommand,
            onBack: goBack,
        });
    }

    return null;
}
