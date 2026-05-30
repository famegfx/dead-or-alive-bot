// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEAD OR ALIVE — Telegram Bot
// PUBG × Mafia | Anime GIFs | Buttons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const gs   = require('./gameState');
const msg  = require('./messages');
const gif  = require('./gifs');

const BOT_TOKEN      = process.env.BOT_TOKEN;
const PORT           = process.env.PORT || 3000;
const LOBBY_TIMEOUT  = 60_000;
const ACTION_TIMEOUT = 30_000;
const WARN_AT        = 10_000;
const ROUND_PAUSE    = 5_000;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// userId → chatId reverse map
const playerGameMap = new Map();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const isGroup   = ctx => ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
const isPrivate = ctx => ctx.chat?.type === 'private';

async function safeReply(ctx, text, extra = {}) {
  try { await ctx.reply(text, extra); } catch (e) { console.error('Reply error:', e.message); }
}

// Send a GIF then a text message to a group
async function sendGifThenText(chatId, gifUrl, text, extra = {}) {
  try {
    await bot.telegram.sendAnimation(chatId, gifUrl);
    await bot.telegram.sendMessage(chatId, text, extra);
  } catch (e) {
    // If GIF fails, just send text
    try { await bot.telegram.sendMessage(chatId, text, extra); } catch (_) {}
  }
}

// Send only text to group (no GIF)
async function sendToGroup(chatId, text, extra = {}) {
  try { await bot.telegram.sendMessage(chatId, text, extra); } catch (e) { console.error('Group send error:', e.message); }
}

// Send GIF + caption to a specific userId
async function sendGifPrivate(userId, gifUrl, text, extra = {}) {
  try {
    await bot.telegram.sendAnimation(userId, gifUrl, { caption: text, ...extra });
    return true;
  } catch (e) {
    try { await bot.telegram.sendMessage(userId, text, extra); return true; }
    catch (_) { return false; }
  }
}

async function sendPrivate(userId, text, extra = {}) {
  try { await bot.telegram.sendMessage(userId, text, extra); return true; }
  catch (e) { return false; }
}

async function editOrReply(ctx, text, extra = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, extra);
    } else {
      await ctx.reply(text, extra);
    }
  } catch (e) {
    try { await ctx.reply(text, extra); } catch (_) {}
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUTTON KEYBOARDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔫 Shoot Target', 'action_shoot'),
      Markup.button.callback('😴 Wait',         'action_wait'),
    ],
    [
      Markup.button.callback('🤝 Sell Bullet',  'action_sell_menu'),
      Markup.button.callback('👤 My Status',    'action_myinfo'),
    ],
    [
      Markup.button.callback('🛒 Shop',         'action_shop'),
      Markup.button.callback('❓ Help',          'action_help'),
    ],
  ]);
}

function shopKeyboard(player) {
  const used = (item) => player[`used_${item}`] ? ' ✅' : '';
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(`🛡️ Shield${used('shield')}`,    'buy_shield'),
      Markup.button.callback(`💊 Medkit${used('medkit')}`,    'buy_medkit'),
    ],
    [
      Markup.button.callback(`🔍 Intel${used('intel')}`,      'buy_intel'),
      Markup.button.callback(`🎭 Disguise${used('disguise')}`, 'buy_disguise'),
    ],
    [ Markup.button.callback('« Back', 'action_back') ],
  ]);
}

function sellKeyboard(alivePlayers, selfId) {
  const others = alivePlayers.filter(p => p.id !== selfId);
  if (others.length === 0) return Markup.inlineKeyboard([[Markup.button.callback('« Back', 'action_back')]]);
  const rows = others.map(p => [Markup.button.callback(`🤝 Sell to ${p.name}`, `sell_to_${p.id}`)]);
  rows.push([Markup.button.callback('« Back', 'action_back')]);
  return Markup.inlineKeyboard(rows);
}

function confirmShootKeyboard(targetName) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(`🔫 FIRE at ${targetName}`, 'confirm_shoot'),
      Markup.button.callback('❌ Cancel', 'action_back'),
    ],
  ]);
}

function backKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('« Back to Menu', 'action_back')]]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEND ROUND BUTTONS TO PLAYER (private)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendRoundButtons(userId, chatId) {
  const player       = gs.getPlayer(chatId, userId);
  const targetPlayer = player?.target ? gs.getPlayer(chatId, player.target) : null;
  if (!player || !player.alive) return;

  const bulletStatus = player.bullet ? '🔫 LOADED' : '🚫 No bullet';
  const targetLine   = targetPlayer  ? `🎯 Target: ${targetPlayer.name}` : '🎯 Target: Reassigning...';
  const text = `⚔️ YOUR TURN\n━━━━━━━━━━━━━━━━━━━━\n${bulletStatus}\n${targetLine}\n\nChoose your action:`;

  // Send a round GIF + action buttons to player's DM
  try {
    await bot.telegram.sendAnimation(userId, gif.roundStart(), {
      caption: text,
      ...mainMenuKeyboard(),
    });
    return true;
  } catch (e) {
    return sendPrivate(userId, text, mainMenuKeyboard());
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROUP COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bot.command('newgame', async (ctx) => {
  if (!isGroup(ctx)) return safeReply(ctx, '⚠️ Use /newgame in a group chat!');
  const chatId = ctx.chat.id;
  if (gs.gameExists(chatId)) return safeReply(ctx, msg.msgGameAlreadyRunning());

  const hostName = ctx.from.first_name || ctx.from.username || 'Someone';
  gs.createGame(chatId, ctx.from.id);
  gs.addPlayer(chatId, ctx.from);
  playerGameMap.set(ctx.from.id, chatId);

  await safeReply(ctx, msg.msgNewGame(hostName));

  const game = gs.getGame(chatId);
  game.roundTimer = setTimeout(async () => {
    const g = gs.getGame(chatId);
    if (!g || g.status !== gs.GAME_STATUS.LOBBY) return;
    if (g.players.size < 4) {
      await sendToGroup(chatId, msg.msgLobbyTimeout());
      gs.endGame(chatId);
    } else {
      await beginGame(chatId);
    }
  }, LOBBY_TIMEOUT);
});

bot.command('join', async (ctx) => {
  if (!isGroup(ctx)) return safeReply(ctx, '⚠️ Use /join in a group chat!');
  const chatId = ctx.chat.id;
  const game   = gs.getGame(chatId);
  if (!game || game.status !== gs.GAME_STATUS.LOBBY) return safeReply(ctx, msg.msgNoGame());

  const result = gs.addPlayer(chatId, ctx.from);
  if (result === 'already_joined') return safeReply(ctx, msg.msgAlreadyJoined(ctx.from.first_name));
  if (result === 'full')           return safeReply(ctx, msg.msgLobbyFull());

  playerGameMap.set(ctx.from.id, chatId);
  const count = game.players.size;
  await safeReply(ctx, msg.msgPlayerJoined(ctx.from.first_name || ctx.from.username, count, 12));

  if (count >= 12) {
    clearTimeout(game.roundTimer);
    await beginGame(chatId);
  }
});

bot.command('start', async (ctx) => {
  if (isGroup(ctx)) {
    const chatId = ctx.chat.id;
    const game   = gs.getGame(chatId);
    if (!game || game.status !== gs.GAME_STATUS.LOBBY) return safeReply(ctx, msg.msgNoGame());
    if (game.players.size < 4) return safeReply(ctx, msg.msgNotEnoughPlayers(game.players.size));
    if (ctx.from.id !== game.startedBy) return safeReply(ctx, '⚠️ Only the host can force start!');
    clearTimeout(game.roundTimer);
    return beginGame(chatId);
  }

  // Private — welcome with GIF + buttons
  const name = ctx.from.first_name || ctx.from.username || 'Hunter';

  const startKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.url('➕ Add to Group', 'https://t.me/PlayUno9Bot?startgroup=true'),
    ],
    [
      Markup.button.callback('🎮 How to Play', 'action_help'),
      Markup.button.callback('🛒 Shop',        'action_shop'),
    ],
    [
      Markup.button.url('👨‍💻 Developer', 'https://t.me/Veerarious'),
    ],
  ]);

  try {
    await ctx.replyWithAnimation(gif.target(), {
      caption: msg.msgWelcome(name),
      ...startKeyboard,
    });
  } catch (e) {
    await safeReply(ctx, msg.msgWelcome(name), startKeyboard);
  }
});

bot.command('players', async (ctx) => {
  if (!isGroup(ctx)) return;
  const game = gs.getGame(ctx.chat.id);
  if (!game) return safeReply(ctx, msg.msgNoGame());
  await safeReply(ctx, msg.msgPlayers([...game.players.values()]));
});

bot.command('shop', async (ctx) => {
  if (isPrivate(ctx)) {
    const userId = ctx.from.id;
    const chatId = playerGameMap.get(userId);
    const player = chatId ? gs.getPlayer(chatId, userId) : null;
    try {
      await ctx.replyWithAnimation(gif.shop(), {
        caption: msg.msgShop(),
        ...(player ? shopKeyboard(player) : backKeyboard()),
      });
    } catch (e) {
      await safeReply(ctx, msg.msgShop(), player ? shopKeyboard(player) : {});
    }
    return;
  }
  await safeReply(ctx, msg.msgShop());
});

bot.command('help', async (ctx) => {
  await safeReply(ctx, msg.msgHelp(), isPrivate(ctx) ? backKeyboard() : {});
});

bot.command('myinfo', async (ctx) => {
  if (!isPrivate(ctx)) return safeReply(ctx, msg.msgOnlyInPrivate());
  const userId       = ctx.from.id;
  const chatId       = playerGameMap.get(userId);
  if (!chatId)        return safeReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  const player       = gs.getPlayer(chatId, userId);
  const targetPlayer = player?.target ? gs.getPlayer(chatId, player.target) : null;
  if (!player)        return safeReply(ctx, msg.msgNotInGame());
  await safeReply(ctx, msg.msgMyInfo(player, targetPlayer), backKeyboard());
});

// Legacy text commands
bot.command('shoot', async (ctx) => { if (!isPrivate(ctx)) return safeReply(ctx, msg.msgOnlyInPrivate()); await handleShoot(ctx); });
bot.command('wait',  async (ctx) => { if (!isPrivate(ctx)) return safeReply(ctx, msg.msgOnlyInPrivate()); await handleWait(ctx); });
bot.command('sell',  async (ctx) => {
  if (!isPrivate(ctx)) return safeReply(ctx, msg.msgOnlyInPrivate());
  const args = ctx.message.text.split(' ');
  const mention = (args[1] || '').replace('@', '').toLowerCase();
  if (!mention) return safeReply(ctx, '❓ Usage: /sell @username');
  await handleSellTo(ctx, ctx.from.id, mention);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTION HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleShoot(ctx) {
  const userId = ctx.from.id;
  const chatId = playerGameMap.get(userId);
  if (!chatId) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  const game   = gs.getGame(chatId);
  const player = gs.getPlayer(chatId, userId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  if (!player || !player.alive) return editOrReply(ctx, '☠️ You are already eliminated!');
  if (!player.bullet) return editOrReply(ctx, msg.msgNoBullet(), mainMenuKeyboard());
  const target = gs.getPlayer(chatId, player.target);
  if (!target || !target.alive) return editOrReply(ctx, msg.msgTargetDead(), mainMenuKeyboard());
  await editOrReply(ctx,
    `🔫 Confirm: Fire at ${target.name}?\n\n⚠️ You only have ONE bullet — make it count!`,
    confirmShootKeyboard(target.name)
  );
}

async function handleWait(ctx) {
  const userId = ctx.from.id;
  const chatId = playerGameMap.get(userId);
  if (!chatId) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  const game   = gs.getGame(chatId);
  const player = gs.getPlayer(chatId, userId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  if (!player || !player.alive) return editOrReply(ctx, '☠️ You are already eliminated!');
  gs.submitAction(chatId, userId, { type: 'wait' });
  await editOrReply(ctx, msg.msgWaitConfirm(), backKeyboard());
}

async function handleBuyItem(ctx, item) {
  const userId = ctx.from.id;
  const chatId = playerGameMap.get(userId);
  if (!chatId) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  const game   = gs.getGame(chatId);
  const player = gs.getPlayer(chatId, userId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  if (!player || !player.alive) return editOrReply(ctx, '☠️ You are already eliminated!');
  if (player[`used_${item}`]) return editOrReply(ctx, msg.msgBuyResult('already_used', item), shopKeyboard(player));

  player[`used_${item}`] = true;
  let resultText = '';

  if (item === 'shield') {
    player.hasShield = true;
    resultText = `🛡️ Shield activated!\nYou will block the next shot aimed at you.`;
  } else if (item === 'medkit') {
    player.hp = Math.min(100, (player.hp || 100) + 40);
    resultText = `💊 Medkit used!\nHP restored to ${player.hp}.`;
  } else if (item === 'intel') {
    const game2  = gs.getGame(chatId);
    const hunter = [...game2.players.values()].find(p => p.alive && p.target === userId);
    resultText = hunter
      ? `🔍 Intel revealed!\n\n👤 ${hunter.name} is hunting you!\nPlan accordingly... 👀`
      : `🔍 Intel revealed!\n\nNobody is assigned to hunt you right now. Stay sharp!`;
  } else if (item === 'disguise') {
    player.disguised = true;
    resultText = `🎭 Disguise activated!\nYour bullet status is hidden this round.`;
  }

  await editOrReply(ctx, resultText, shopKeyboard(player));
}

async function handleSellTo(ctx, userId, targetUsername) {
  const chatId = playerGameMap.get(userId);
  if (!chatId) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  const game   = gs.getGame(chatId);
  const player = gs.getPlayer(chatId, userId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return editOrReply(ctx, msg.msgGameNotRunning(), mainMenuKeyboard());
  if (!player || !player.alive) return editOrReply(ctx, '☠️ You are already eliminated!');
  if (!player.bullet) return editOrReply(ctx, msg.msgNoBullet(), mainMenuKeyboard());

  const alive = gs.alivePlayers(chatId);
  const buyer = alive.find(p =>
    (p.username || '').replace('@', '').toLowerCase() === targetUsername ||
    p.name.toLowerCase() === targetUsername ||
    String(p.id) === targetUsername
  );
  if (!buyer)              return editOrReply(ctx, msg.msgTargetNotFound(), mainMenuKeyboard());
  if (buyer.id === userId) return editOrReply(ctx, msg.msgCantShootSelf(), mainMenuKeyboard());
  if (!buyer.alive)        return editOrReply(ctx, msg.msgTargetDead(), mainMenuKeyboard());

  gs.submitAction(chatId, userId, { type: 'sell', buyerId: buyer.id });
  await editOrReply(ctx, msg.msgSellConfirm(buyer.name), backKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CALLBACK QUERY HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bot.on('callback_query', async (ctx) => {
  const data   = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  const chatId = playerGameMap.get(userId);
  await ctx.answerCbQuery().catch(() => {});

  if (data === 'action_back') {
    const player       = chatId ? gs.getPlayer(chatId, userId) : null;
    const targetPlayer = player?.target ? gs.getPlayer(chatId, player.target) : null;
    const bulletStatus = player?.bullet ? '🔫 LOADED' : '🚫 No bullet';
    const targetLine   = targetPlayer   ? `🎯 Target: ${targetPlayer.name}` : '🎯 Waiting for game...';
    const text = player?.alive
      ? `⚔️ YOUR TURN\n━━━━━━━━━━━━━━━━━━━━\n${bulletStatus}\n${targetLine}\n\nChoose your action:`
      : `💀 DEAD OR ALIVE\n━━━━━━━━━━━━━━━━━━━━\nWhat would you like to do?`;
    return editOrReply(ctx, text, mainMenuKeyboard());
  }

  if (data === 'action_shoot')    return handleShoot(ctx);
  if (data === 'action_wait')     return handleWait(ctx);

  if (data === 'confirm_shoot') {
    const player = chatId ? gs.getPlayer(chatId, userId) : null;
    if (!player || !player.bullet) return editOrReply(ctx, msg.msgNoBullet(), mainMenuKeyboard());
    const target = gs.getPlayer(chatId, player.target);
    if (!target || !target.alive) return editOrReply(ctx, msg.msgTargetDead(), mainMenuKeyboard());
    gs.submitAction(chatId, userId, { type: 'shoot' });
    return editOrReply(ctx, msg.msgShootConfirm(target.name), backKeyboard());
  }

  if (data === 'action_sell_menu') {
    const player = chatId ? gs.getPlayer(chatId, userId) : null;
    if (!player || !player.alive) return editOrReply(ctx, '☠️ You are eliminated!');
    if (!player.bullet) return editOrReply(ctx, msg.msgNoBullet(), mainMenuKeyboard());
    const alive = gs.alivePlayers(chatId).filter(p => p.id !== userId);
    if (alive.length === 0) return editOrReply(ctx, '❌ No other players alive!', mainMenuKeyboard());
    return editOrReply(ctx,
      `🤝 SELL BULLET\n━━━━━━━━━━━━━━━━━━━━\nChoose who to sell to.\nThey get your bullet — you become their bodyguard for 1 round.`,
      sellKeyboard(alive, userId)
    );
  }

  if (data.startsWith('sell_to_')) {
    const targetId = Number(data.replace('sell_to_', ''));
    return handleSellTo(ctx, userId, String(targetId));
  }

  if (data === 'action_shop') {
    const player = chatId ? gs.getPlayer(chatId, userId) : null;
    return editOrReply(ctx, msg.msgShop(), player ? shopKeyboard(player) : backKeyboard());
  }

  if (data === 'buy_shield')   return handleBuyItem(ctx, 'shield');
  if (data === 'buy_medkit')   return handleBuyItem(ctx, 'medkit');
  if (data === 'buy_intel')    return handleBuyItem(ctx, 'intel');
  if (data === 'buy_disguise') return handleBuyItem(ctx, 'disguise');

  if (data === 'action_myinfo') {
    const player       = chatId ? gs.getPlayer(chatId, userId) : null;
    const targetPlayer = player?.target ? gs.getPlayer(chatId, player.target) : null;
    if (!player) return editOrReply(ctx, msg.msgNotInGame(), mainMenuKeyboard());
    return editOrReply(ctx, msg.msgMyInfo(player, targetPlayer), backKeyboard());
  }

  if (data === 'action_help') {
    return editOrReply(ctx, msg.msgHelp(), backKeyboard());
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BEGIN GAME — with anime GIFs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function beginGame(chatId) {
  const game = gs.startGame(chatId);
  if (!game) return;

  const playerNames = [...game.players.values()].map(p => p.name);

  // 🎬 Game start GIF
  await sendGifThenText(chatId, gif.gameStart(), msg.msgGameStart(playerNames));

  // DM each player their secret target with GIF
  let dmFailures = 0;
  for (const player of game.players.values()) {
    const target = gs.getPlayer(chatId, player.target);
    if (!target) continue;
    const sent = await sendGifPrivate(
      player.id,
      gif.target(),
      msg.msgPrivateTarget(target.name, target.username)
    );
    if (!sent) dmFailures++;
  }

  if (dmFailures > 0) {
    await sendToGroup(chatId,
      `⚠️ ${dmFailures} player(s) haven't started a private chat with me!\nOpen my DM and tap Start to receive your secret target.`
    );
  }

  await new Promise(r => setTimeout(r, 10_000));
  await startRound(chatId);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GAME LOOP — with anime GIFs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function startRound(chatId) {
  const game = gs.getGame(chatId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return;

  const alive   = gs.alivePlayers(chatId);
  const armed   = alive.filter(p => p.bullet);
  const unarmed = alive.filter(p => !p.bullet);

  // Final 2 — special GIF
  if (alive.length === 2) {
    await sendGifThenText(chatId, gif.finalTwo(), msg.msgRoundStart(game.round, alive.length, armed, unarmed));
  } else {
    await sendGifThenText(chatId, gif.roundStart(), msg.msgRoundStart(game.round, alive.length, armed, unarmed));
  }

  // Send each player their action buttons with GIF
  for (const player of alive) {
    const sent = await sendRoundButtons(player.id, chatId);
    if (sent === false) {
      gs.submitAction(chatId, player.id, { type: 'wait' });
    }
  }

  const warnTimer = setTimeout(async () => {
    const g = gs.getGame(chatId);
    if (!g || g.status !== gs.GAME_STATUS.PLAYING) return;
    await sendToGroup(chatId, msg.msgTimerWarning(10));
  }, ACTION_TIMEOUT - WARN_AT);

  game.actionTimer = setTimeout(async () => {
    clearTimeout(warnTimer);
    await resolveAndContinue(chatId);
  }, ACTION_TIMEOUT);
}

async function resolveAndContinue(chatId) {
  const game = gs.getGame(chatId);
  if (!game || game.status !== gs.GAME_STATUS.PLAYING) return;

  const alive = gs.alivePlayers(chatId);
  for (const p of alive) {
    if (!game.pendingActions.has(p.id)) {
      gs.submitAction(chatId, p.id, { type: 'wait' });
      // AFK GIF (1 in 3 chance to keep it fun not spammy)
      if (Math.random() < 0.33) {
        await sendGifThenText(chatId, gif.wait(), msg.msgAutoWait(p.username));
      } else {
        await sendToGroup(chatId, msg.msgAutoWait(p.username));
      }
    }
  }

  const currentRound = game.round;
  const events       = gs.resolveRound(chatId);
  const aliveNow     = gs.alivePlayers(chatId);

  // Build results text
  const resultsText = msg.msgRoundResults(currentRound, events, aliveNow);

  // Pick GIF based on what happened this round
  const hasKill      = events.some(e => e.type === 'eliminated');
  const hasBodyguard = events.some(e => e.type === 'bodyguard_save');
  const hasDeal      = events.some(e => e.type === 'deal');

  let roundGif;
  if (hasBodyguard)     roundGif = gif.bodyguard();
  else if (hasKill)     roundGif = gif.kill();
  else if (hasDeal)     roundGif = gif.deal();
  else                  roundGif = gif.wait();

  await sendGifThenText(chatId, roundGif, resultsText);

  // Extra GIF for each elimination (dramatic!)
  for (const e of events) {
    if (e.type === 'eliminated') {
      await new Promise(r => setTimeout(r, 1500));
      await sendGifThenText(chatId, gif.eliminated(),
        `☠️ ${e.victimName} has been eliminated!\n${e.killerName} collects the bounty.`
      );
    }
  }

  await new Promise(r => setTimeout(r, ROUND_PAUSE));

  const winner = gs.checkWinner(chatId);
  if (winner) {
    const allPlayers = [...game.players.values()];
    await sendGifThenText(chatId, gif.winner(), msg.msgWinner(winner, allPlayers, currentRound));
    gs.endGame(chatId);
    return;
  }

  if (aliveNow.length === 0) {
    await sendToGroup(chatId, msg.msgNoWinnerDraw([]));
    gs.endGame(chatId);
    return;
  }

  const armedNow = aliveNow.filter(p => p.bullet);
  if (armedNow.length === 0) {
    const allPlayers = [...game.players.values()];
    aliveNow.sort((a, b) => b.kills - a.kills);
    await sendGifThenText(chatId, gif.winner(), msg.msgWinner(aliveNow[0], allPlayers, currentRound));
    gs.endGame(chatId);
    return;
  }

  await startRound(chatId);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KEEP-ALIVE HTTP SERVER + SELF-PING
// Prevents Render free tier from sleeping
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RENDER_URL = process.env.RENDER_URL || '';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('💀 DEAD OR ALIVE is alive!\n');
});

server.listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);

  // Self-ping every 10 minutes to prevent Render sleep
  if (RENDER_URL) {
    setInterval(() => {
      http.get(RENDER_URL, (res) => {
        console.log(`🏓 Self-ping OK — status ${res.statusCode}`);
      }).on('error', (e) => {
        console.error('🏓 Self-ping failed:', e.message);
      });
    }, 10 * 60 * 1000); // every 10 minutes
    console.log(`🏓 Self-ping enabled → ${RENDER_URL}`);
  } else {
    console.log('⚠️  RENDER_URL not set — add it in Render environment variables to prevent sleep');
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAUNCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

bot.launch()
  .then(() => console.log('💀 DEAD OR ALIVE bot is running!'))
  .catch(err => console.error('Bot launch error:', err));

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
