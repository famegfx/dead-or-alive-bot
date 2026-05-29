// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEAD OR ALIVE — Telegram Bot
// PUBG × Mafia | One Bullet. One Target.
// Deploy on Render: set BOT_TOKEN env var
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();

const { Telegraf } = require('telegraf');
const http         = require('http');

const gs  = require('./gameState');
const msg = require('./messages');

// ── Config ──────────────────────────
const BOT_TOKEN      = process.env.BOT_TOKEN;
const PORT           = process.env.PORT || 3000;
const LOBBY_TIMEOUT  = 60_000;  // 60s to join
const ACTION_TIMEOUT = 30_000;  // 30s to submit action
const WARN_AT        = 10_000;  // warn at 10s left
const ROUND_PAUSE    = 4_000;   // 4s between rounds for reading

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set in environment variables!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isGroup(ctx) {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
}

function isPrivate(ctx) {
  return ctx.chat?.type === 'private';
}

async function safeReply(ctx, text) {
  try {
    await ctx.reply(text);
  } catch (e) {
    console.error('Reply error:', e.message);
  }
}

async function sendToGroup(bot, chatId, text) {
  try {
    await bot.telegram.sendMessage(chatId, text);
  } catch (e) {
    console.error('Group send error:', e.message);
  }
}

async function sendPrivate(bot, userId, text) {
  try {
    await bot.telegram.sendMessage(userId, text);
    return true;
  } catch (e) {
    // User hasn't started private chat with bot
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GAME LOOP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function startRound(chatId) {
  const game = gs.getGame(chatId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return;

  const alive   = gs.alivePlayers(chatId);
  const armed   = alive.filter(p => p.bullet);
  const unarmed = alive.filter(p => !p.bullet);

  // Post round status to group
  await sendToGroup(bot, chatId, msg.msgRoundStart(game.round, alive.length, armed, unarmed));

  // DM each alive player their prompt
  for (const player of alive) {
    const targetPlayer = player.target ? gs.getPlayer(chatId, player.target) : null;
    const sent = await sendPrivate(bot, player.id,
      msg.msgPrivateRoundPrompt(game.round, player, targetPlayer)
    );
    if (!sent) {
      // Can't DM them — auto wait
      gs.submitAction(chatId, player.id, { type: 'wait' });
    }
  }

  // Warn at 10s
  const warnTimer = setTimeout(async () => {
    const stillGame = gs.getGame(chatId);
    if (!stillGame || stillGame.status !== gs.GAME_STATUS.PLAYING) return;
    await sendToGroup(bot, chatId, msg.msgTimerWarning(10));
  }, ACTION_TIMEOUT - WARN_AT);

  // Resolve round after timeout
  game.actionTimer = setTimeout(async () => {
    clearTimeout(warnTimer);
    await resolveAndContinue(chatId);
  }, ACTION_TIMEOUT);
}

async function resolveAndContinue(chatId) {
  const game = gs.getGame(chatId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return;

  // Auto-wait anyone who didn't act
  const alive = gs.alivePlayers(chatId);
  for (const p of alive) {
    if (!game.pendingActions.has(p.id)) {
      gs.submitAction(chatId, p.id, { type: 'wait' });
      await sendToGroup(bot, chatId, msg.msgAutoWait(p.username));
    }
  }

  const currentRound = game.round;

  // Resolve
  const events   = gs.resolveRound(chatId);
  const aliveNow = gs.alivePlayers(chatId);

  // Post results
  await sendToGroup(bot, chatId, msg.msgRoundResults(currentRound, events, aliveNow));

  // Small pause for drama
  await new Promise(r => setTimeout(r, ROUND_PAUSE));

  // Check winner
  const winner = gs.checkWinner(chatId);
  if (winner) {
    const allPlayers = [...game.players.values()];
    await sendToGroup(bot, chatId, msg.msgWinner(winner, allPlayers, currentRound));
    gs.endGame(chatId);
    return;
  }

  // Nobody alive somehow
  if (aliveNow.length === 0) {
    await sendToGroup(bot, chatId, msg.msgNoWinnerDraw([]));
    gs.endGame(chatId);
    return;
  }

  // No bullets left — draw between survivors
  const armedNow = aliveNow.filter(p => p.bullet);
  if (armedNow.length === 0) {
    const allPlayers = [...game.players.values()];
    // Most kills wins
    aliveNow.sort((a, b) => b.kills - a.kills);
    await sendToGroup(bot, chatId, msg.msgWinner(aliveNow[0], allPlayers, currentRound));
    gs.endGame(chatId);
    return;
  }

  // Continue next round
  await startRound(chatId);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROUP COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bot.command('newgame', async (ctx) => {
  if (!isGroup(ctx)) {
    return safeReply(ctx, '⚠️ Use /newgame in a group chat!');
  }

  const chatId = ctx.chat.id;

  if (gs.gameExists(chatId)) {
    return safeReply(ctx, msg.msgGameAlreadyRunning());
  }

  const hostName = ctx.from.first_name || ctx.from.username || 'Someone';
  gs.createGame(chatId, ctx.from.id);

  // Auto-add host
  gs.addPlayer(chatId, ctx.from);

  await safeReply(ctx, msg.msgNewGame(hostName));

  // Lobby timeout
  const game = gs.getGame(chatId);
  game.roundTimer = setTimeout(async () => {
    const g = gs.getGame(chatId);
    if (!g || g.status !== gs.GAME_STATUS.LOBBY) return;

    if (g.players.size < 4) {
      await sendToGroup(bot, chatId, msg.msgLobbyTimeout());
      gs.endGame(chatId);
    } else {
      // Auto-start if enough players
      await beginGame(chatId);
    }
  }, LOBBY_TIMEOUT);
});

bot.command('join', async (ctx) => {
  if (!isGroup(ctx)) {
    return safeReply(ctx, '⚠️ Use /join in a group chat!');
  }

  const chatId = ctx.chat.id;
  const game   = gs.getGame(chatId);

  if (!game || game.status !== gs.GAME_STATUS.LOBBY) {
    return safeReply(ctx, msg.msgNoGame());
  }

  const result = gs.addPlayer(chatId, ctx.from);

  if (result === 'already_joined') {
    return safeReply(ctx, msg.msgAlreadyJoined(ctx.from.first_name));
  }
  if (result === 'full') {
    return safeReply(ctx, msg.msgLobbyFull());
  }

  const count = game.players.size;
  await safeReply(ctx, msg.msgPlayerJoined(ctx.from.first_name || ctx.from.username, count, 12));

  // Auto-start at 12 players
  if (count >= 12) {
    clearTimeout(game.roundTimer);
    await beginGame(chatId);
  }
});

bot.command('start', async (ctx) => {
  if (!isGroup(ctx)) return;

  const chatId = ctx.chat.id;
  const game   = gs.getGame(chatId);

  if (!game || game.status !== gs.GAME_STATUS.LOBBY) {
    return safeReply(ctx, msg.msgNoGame());
  }

  if (game.players.size < 4) {
    return safeReply(ctx, msg.msgNotEnoughPlayers(game.players.size));
  }

  // Only host or admin can force start
  if (ctx.from.id !== game.startedBy) {
    return safeReply(ctx, '⚠️ Only the host can force start the game!');
  }

  clearTimeout(game.roundTimer);
  await beginGame(chatId);
});

bot.command('players', async (ctx) => {
  if (!isGroup(ctx)) return;

  const chatId = ctx.chat.id;
  const game   = gs.getGame(chatId);

  if (!game) return safeReply(ctx, msg.msgNoGame());

  const players = [...game.players.values()];
  await safeReply(ctx, msg.msgPlayers(players));
});

bot.command('help', async (ctx) => {
  await safeReply(ctx, msg.msgHelp());
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BEGIN GAME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function beginGame(chatId) {
  const game = gs.startGame(chatId);
  if (!game) return;

  const playerNames = [...game.players.values()].map(p => p.name);
  await sendToGroup(bot, chatId, msg.msgGameStart(playerNames));

  // DM each player their secret target
  let dmFailures = 0;
  for (const player of game.players.values()) {
    const target = gs.getPlayer(chatId, player.target);
    if (!target) continue;

    const sent = await sendPrivate(bot, player.id,
      msg.msgPrivateTarget(target.name, target.username)
    );
    if (!sent) dmFailures++;
  }

  if (dmFailures > 0) {
    await sendToGroup(bot, chatId,
      `⚠️ ${dmFailures} player(s) need to start a private chat with me first!\nSend me /start in private, then the game will DM you.`
    );
  }

  // Wait then start round 1
  await new Promise(r => setTimeout(r, 10_000));
  await startRound(chatId);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRIVATE CHAT ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Find which game a user is currently in
function findPlayerGame(userId) {
  // We need to scan all games — fine for small scale
  // For production, maintain a userId→chatId reverse map
  const { games } = require('./gameState');
  // games is not exported directly, so we'll handle this differently
  return null; // handled below via a workaround
}

// We store a reverse map: userId → chatId
const playerGameMap = new Map();

// Patch addPlayer to update reverse map
const origAddPlayer = gs.addPlayer.bind(gs);
// We'll update the map in the join handler instead

bot.command('shoot', async (ctx) => {
  if (!isPrivate(ctx)) {
    return safeReply(ctx, msg.msgOnlyInPrivate());
  }

  const userId = ctx.from.id;
  const chatId = playerGameMap.get(userId);

  if (!chatId) return safeReply(ctx, msg.msgGameNotRunning());

  const game   = gs.getGame(chatId);
  const player = gs.getPlayer(chatId, userId);

  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return safeReply(ctx, msg.msgGameNotRunning());
  if (!player) return safeReply(ctx, msg.msgNotInGame());
  if (!player.alive) return safeReply(ctx, '☠️ You are already eliminated!');
  if (!player.bullet) return safeReply(ctx, msg.msgNoBullet());

  const target = gs.getPlayer(chatId, player.target);
  if (!target) return safeReply(ctx, '❌ No target assigned yet!');
  if (!target.alive) return safeReply(ctx, msg.msgTargetDead());

  gs.submitAction(chatId, userId, { type: 'shoot' });
  await safeReply(ctx, msg.msgShootConfirm(target.name));
});

bot.command('sell', async (ctx) => {
  if (!isPrivate(ctx)) {
    return safeReply(ctx, msg.msgOnlyInPrivate());
  }

  const userId = ctx.from.id;
  const chatId = playerGameMap.get(userId);

  if (!chatId) return safeReply(ctx, msg.msgGameNotRunning());

  const game   = gs.getGame(chatId);
  const player = gs.getPlayer(chatId, userId);

  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return safeReply(ctx, msg.msgGameNotRunning());
  if (!player) return safeReply(ctx, msg.msgNotInGame());
  if (!player.alive) return safeReply(ctx, '☠️ You are already eliminated!');
  if (!player.bullet) return safeReply(ctx, msg.msgNoBullet());

  // Parse @username from command args
  const args    = ctx.message.text.split(' ');
  const mention = args[1]; // e.g. @Sara

  if (!mention) {
    return safeReply(ctx, '❓ Usage: /sell @username\nExample: /sell @Sara');
  }

  // Find buyer by username
  const targetUsername = mention.replace('@', '').toLowerCase();
  const alive          = gs.alivePlayers(chatId);
  const buyer          = alive.find(p =>
    (p.username || '').replace('@', '').toLowerCase() === targetUsername ||
    p.name.toLowerCase() === targetUsername
  );

  if (!buyer)          return safeReply(ctx, msg.msgTargetNotFound());
  if (buyer.id === userId) return safeReply(ctx, msg.msgCantShootSelf());
  if (!buyer.alive)    return safeReply(ctx, msg.msgTargetDead());

  gs.submitAction(chatId, userId, { type: 'sell', buyerId: buyer.id });
  await safeReply(ctx, msg.msgSellConfirm(buyer.name));
});

bot.command('wait', async (ctx) => {
  if (!isPrivate(ctx)) {
    return safeReply(ctx, msg.msgOnlyInPrivate());
  }

  const userId = ctx.from.id;
  const chatId = playerGameMap.get(userId);

  if (!chatId) return safeReply(ctx, msg.msgGameNotRunning());

  const game   = gs.getGame(chatId);
  const player = gs.getPlayer(chatId, userId);

  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return safeReply(ctx, msg.msgGameNotRunning());
  if (!player) return safeReply(ctx, msg.msgNotInGame());
  if (!player.alive) return safeReply(ctx, '☠️ You are already eliminated!');

  gs.submitAction(chatId, userId, { type: 'wait' });
  await safeReply(ctx, msg.msgWaitConfirm());
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH JOIN TO TRACK userId → chatId
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// We intercept the join command to populate playerGameMap
// This is done by wrapping after the join logic adds to game.players

const originalJoinHandler = bot.command.bind(bot);

// Re-register join to also update playerGameMap
bot.on('text', async (ctx, next) => {
  // Track when /join is processed
  if (ctx.message?.text?.startsWith('/join') && isGroup(ctx)) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    // Will be set regardless; game state already set in /join handler
    // We set it here as a post-hook approximation
    setTimeout(() => {
      const game = gs.getGame(chatId);
      if (game && game.players.has(userId)) {
        playerGameMap.set(userId, chatId);
      }
    }, 100);
  }
  return next();
});

// Also track on /newgame (host auto-joins)
bot.on('text', async (ctx, next) => {
  if (ctx.message?.text?.startsWith('/newgame') && isGroup(ctx)) {
    setTimeout(() => {
      playerGameMap.set(ctx.from.id, ctx.chat.id);
    }, 100);
  }
  return next();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KEEP-ALIVE HTTP SERVER (for Render)
// Render free tier spins down — this keeps it awake
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('💀 DEAD OR ALIVE bot is alive!\n');
});

server.listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAUNCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bot.launch()
  .then(() => console.log('💀 DEAD OR ALIVE bot is running!'))
  .catch(err => console.error('Bot launch error:', err));

// Graceful shutdown
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
