# Termigram

A fast, keyboard-navigable Telegram client that runs entirely in your terminal, built with React, Ink, and GramJS.

## Features

- **Unified Chat Dashboard**: All conversations in one scrollable list — pinned chats float to the top marked with 📌, followed by recent dialogs with unread counts.
- **Live Messaging**: Send and receive messages in real time without refreshing.
- **Typing Indicators**: Animated dots appear while the other person is typing.
- **Group Chat Support**: Sender names are shown inline for group conversations.
- **Reply Rendering**: Quoted reply context is displayed above the message with a block-quote indicator.
- **Session Persistence**: Authenticates once via phone number + SMS code (+ optional 2FA), then saves the session so subsequent launches connect automatically.
- **Responsive Layout**: Adapts to your terminal width and reacts to resize events.

---

## Quick Start

Run without installing:

```bash
npx termigram
```

Or install globally:

```bash
npm install -g termigram
termigram
```

### Run from Source

```bash
git clone https://github.com/miknosaj/Termigram.git
cd Termigram
npm install
npm start
```

On first launch you will be prompted for your phone number and a Telegram verification code. Your session is saved to a local `.env` file so you won't need to log in again.

---

## Navigation

### Dashboard

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move through chat list |
| `Enter` | Open selected chat |
| `L` | Log out |
| `q` | Quit |

### Inside a Chat

| Input | Action |
|-------|--------|
| `esc` | Return to dashboard |
| `/back` | Return to dashboard |
| `/history <n>` | Reload chat with `n` messages (default: 20) |
| `/logout` | Log out and clear saved session |
| `/quit` or `/exit` | Disconnect and exit |

---

## License

[MIT](https://choosealicense.com/licenses/mit/)
