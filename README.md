# Termigram

A Telegram client for the terminal that's only slightly less uggo. Built with [Ink](https://github.com/vadimdemedes/ink) and [GramJS](https://github.com/gram-js/gramjs).

## Install

```bash
npx termigram
```

Or globally:

```bash
npm install -g termigram
termigram
```

## Auth

On first launch, you'll be prompted for your phone number and a Telegram verification code. Your session is saved to `~/.termigram/config.json` — you won't need to log in again.

## Keys

**Dashboard**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate chats |
| `Enter` | Open chat |
| `S` | Settings |
| `L` | Log out |
| `Q` | Quit |

**Chat**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Scroll history |
| `esc` | Back to dashboard |
| `/history <n>` | Reload with n messages |
| `/quit` | Exit |

**Settings**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate |
| `←` / `→` | Change value |
| `esc` | Save & exit |

## From source

```bash
git clone https://github.com/miknosaj/Termigram.git
cd Termigram
npm install
npm start
```

## License

MIT
