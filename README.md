# Termigram

A fast, keyboard-navigable, and dynamic command-line Telegram client built with React, Ink, and GramJS.

![Termigram UI Concept](https://raw.githubusercontent.com/jasonkim/termigram/main/demo.png) *(Preview placeholder)*

Termigram provides a focused, distraction-free messaging experience directly inside your terminal, featuring live chat updates, typing indicators, pinned chats, and a beautiful UI.

## ✨ Features

- **Live Chat View**: Send and receive messages instantly.
- **Typing Indicators**: Visual indicators when the other party is typing.
- **Pinned Chats**: Quick access to your most important conversations right from the menu.
- **Browse All Chats**: Keyboard-navigated list displaying recent conversations with unread counts.
- **Secure Authentication**: Connects safely via standard Telegram MTProto using mobile 2FA verification.
- **Vim-like Aesthetics**: Designed with terminal-native shortcuts and crisp text interactions.

---

## 🚀 Quick Start

### Installation

If you have Node.js installed, you can try Termigram immediately without cloning the repo:

```bash
npx termigram
```

Or install it globally to run it from anywhere anytime:

```bash
npm install -g termigram
termigram
```

### Running Locally (for Developers)

To run the project from source:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/termigram.git
   cd termigram
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the client:
   ```bash
   npm start
   ```

## ⌨️ Usage & Commands

Navigating and interacting with Termigram relies on standard CLI inputs.

### General Navigation
- `↑` / `↓` - Navigate menus and lists.
- `Return` / `Enter` - Select a chat to open.
- `esc` - Go back to the previous screen.
- `L` - Log out of your Telegram account (from non-chat screens).
- `q` - Quit the application (from non-chat screens).

### Chat Commands
While inside a conversation, you can use the following commands by typing them directly into the input bar:

- `/history <n>` - Adjust the loaded chat history (default is 20 messages). Example: `/history 50`.
- `/back` - Return to the chat menu (alias for `esc`).
- `/logout` - Log out of your Telegram account and clear local session secrets.
- `/quit` or `/exit` - Close the connection, clear the terminal, and exit Termigram.

### Menu Commands
- `/chats` - Browse all unpinned recent conversations.
- `/open <Name>` - Directly attempt to open a chat by their name.

---

## 🗺️ Roadmap

Termigram is actively under development! While the core sending/receiving foundations are rock solid, there are several "table-stakes" missing features that are planned for upstream integration to make it a fully-fledged daily driver app.

### Priority 1 (Core Foundations)
- [ ] **Read Receipts (`Mark as Read`)**: The app currently does not signal to Telegram servers that messages were viewed. This must be implemented so chats sync as "read" accurately.
- [ ] **Message Formatting & Replies**: Add a visual indentation block quoting the message being replied to, and natively parse/render Telegram Markdown (bold, italic, code blocks).
- [ ] **Media Indicators**: Basic fallback string replacements indicating when an Image, GIF, Voice Note, or File was sent in the chat history.
- [ ] **Global User Search**: Ability to construct a new chat by looking up a username or phone number from your official contacts book, not just people in your recent history.

### Priority 2 (Rich Messaging & Ergonomics)
- [ ] **Message History Pagination**: Infinite scroll upwards! Add a mechanism (e.g. `Ctrl+U`) to natively load the previous page of history.
- [ ] **Group Chat Senders**: Within group chats, visually delineate different senders' names instead of rolling them all under the thread name.

### Priority 3 (Ergonomics)
- [ ] Multiple Account Support / Profile Switching
- [ ] Customizable theme files (accent colors, border styles)

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/your-username/termigram/issues).

## 📝 License
[MIT](https://choosealicense.com/licenses/mit/)
