# 💀 DEAD OR ALIVE
### PUBG × Mafia Telegram Bot — One Bullet. One Target. No Mercy.

---

## 🎮 How to Play

Every player gets:
- 🔫 **ONE bullet** — use it wisely or sell it
- 🎯 **ONE secret target** — assigned in a circular chain

Each round you choose (via private DM to the bot):
- `/shoot` — fire at your assigned target (guaranteed kill)
- `/sell @username` — sell bullet, become that player's bodyguard
- `/wait` — observe this round

---

## 🚀 Setup

### 1. Create a Telegram Bot
1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the steps
3. Copy the **bot token**
4. Send `/setprivacy` → select your bot → choose **Disable**
   (so bot can read group messages)

### 2. Install & Run Locally
```bash
git clone <your-repo>
cd last-bounty
npm install
cp .env.example .env
# Edit .env and paste your BOT_TOKEN
npm start
```

### 3. Deploy on Render
1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo
4. Set these:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variable:** `BOT_TOKEN` = your token
5. Click **Deploy**

> ✅ The bot includes an HTTP server on `PORT` so Render keeps it alive.

---

## 🎯 Group Commands

| Command | Description |
|---------|-------------|
| `/newgame` | Open a lobby (host auto-joins) |
| `/join` | Enter the match |
| `/start` | Force start (host only, min 4 players) |
| `/players` | See who joined |
| `/help` | Show all commands |

## 🔒 Private Commands (DM the bot)

| Command | Description |
|---------|-------------|
| `/shoot` | Fire at your secret target |
| `/sell @username` | Sell bullet, become bodyguard |
| `/wait` | Skip this round |

---

## ⚙️ Game Config (src/index.js)

```js
const LOBBY_TIMEOUT  = 60_000;  // 60s join window
const ACTION_TIMEOUT = 30_000;  // 30s per round
const WARN_AT        = 10_000;  // warn 10s before timeout
const ROUND_PAUSE    = 4_000;   // pause between rounds
```

---

## 🏆 Win Conditions

- Last player alive = **WINNER 🍗**
- If all bullets are spent = most kills wins
- Unarmed player who survives = **LEGEND award** 🏅

---

## 📁 Project Structure

```
last-bounty/
├── src/
│   ├── index.js      ← Bot entry point & all handlers
│   ├── gameState.js  ← Game logic & state management
│   ├── messages.js   ← All message templates (𝖲𝖺𝗇𝗌 & 𝗕𝗼𝗹𝗱)
│   └── fonts.js      ← Unicode Sans/Bold font converter
├── .env.example
├── package.json
└── README.md
```
