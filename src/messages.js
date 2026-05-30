// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MESSAGE TEMPLATES
// All bot messages styled with 𝖲𝖺𝗇𝗌 & 𝗕𝗼𝗹𝗱 𝗦𝗮𝗻𝘀
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { sans, bold, LINE, LINE2 } = require('./fonts');

// ── Kill story templates ──
const KILL_STORIES = [
  (k, v) => `🔫 ${k} fired the ${bold('only shot')} — ${v} never saw it coming`,
  (k, v) => `💨 ${k} waited all game for this moment — ${v} dropped`,
  (k, v) => `🎯 ${k} tracked ${v} across every round — finally collected`,
  (k, v) => `⚡ ${k} pulled the trigger without hesitation — ${v} is out`,
  (k, v) => `🩸 ${k} delivered the ${bold('contract')} — ${v} eliminated`,
  (k, v) => `🗡️  ${k} moved silently — ${v} didn't even hear the shot`,
];

function randomKillStory(killerName, victimName) {
  const story = KILL_STORIES[Math.floor(Math.random() * KILL_STORIES.length)];
  return story(killerName, victimName);
}

// ─────────────────────────────────────
// LOBBY MESSAGES
// ─────────────────────────────────────

function msgNewGame(hostName) {
  return `
💀 ${bold('DEAD OR ALIVE')}
${LINE}
${sans('A new match is opening')}

🔫 ${sans('Every player gets')} ${bold('ONE bullet')}
🎯 ${sans('Every player gets a')} ${bold('secret target')}
🤝 ${sans('Trade  •  Betray  •  Survive')}

${LINE2}
${bold('Type /join to enter!')}
${sans('Need 4–12 players  |  60 seconds')}

${sans('Started by')} ${bold(hostName)}
`.trim();
}

function msgPlayerJoined(playerName, count, max) {
  return `✅ ${bold(playerName)} ${sans('entered Dead or Alive!')} (${bold(count)}/${max})`;
}

function msgAlreadyJoined(playerName) {
  return `⚠️ ${bold(playerName)}${sans(', you already joined!')}`;
}

function msgLobbyFull() {
  return `🚫 ${bold('Lobby is full!')} ${sans('Max 12 players reached.')}`;
}

function msgNoGame() {
  return `❌ ${sans('No active game. Type')} ${bold('/newgame')} ${sans('to start one!')}`;
}

function msgGameAlreadyRunning() {
  return `⚠️ ${sans('A game is already')} ${bold('running')} ${sans('in this group!')}`;
}

function msgNotEnoughPlayers(count) {
  return `⚠️ ${sans('Need at least')} ${bold('4 players')} ${sans('to start.')} ${sans('Currently:')} ${bold(count)}`;
}

function msgLobbyTimeout() {
  return `⏰ ${bold('Lobby closed')} — ${sans('not enough players joined. Try again!')}`;
}

// ─────────────────────────────────────
// GAME START MESSAGES
// ─────────────────────────────────────

function msgGameStart(playerNames) {
  const list = playerNames.map(n => `  🔴 ${bold(n)}`).join('\n');
  return `
🪂 ${bold('DEAD OR ALIVE — THE HUNT BEGINS')}
${LINE}
${sans('Players drop onto the island')}${sans('...')}

${list}

${LINE2}
🔫 ${sans('Each hunter has been assigned a')} ${bold('secret target')}
💌 ${sans('Check your')} ${bold('private messages')} ${sans('from me!')}
${LINE2}
⏳ ${bold('Round 1')} ${sans('starts in')} ${bold('10 seconds')}${sans('...')}
`.trim();
}

function msgPrivateTarget(targetName, targetUsername) {
  return `
🎯 ${bold('YOUR SECRET TARGET')}
${LINE}
${sans('You have been assigned')}${sans(':')}

  👤 ${bold(targetName)} ${sans(`(${targetUsername})`)}

${LINE2}
🔫 ${sans('You have')} ${bold('ONE bullet')} — ${sans('use it wisely')}
🤫 ${sans('Keep this secret. Trust nobody.')}

${sans('Commands during the game')}${sans(':')}
/shoot — ${sans('fire at your target')}
/sell   — ${sans('trade your bullet for protection')}
/wait   — ${sans('observe this round')}
`.trim();
}

// ─────────────────────────────────────
// ROUND MESSAGES
// ─────────────────────────────────────

function msgRoundStart(round, aliveCount, armed, unarmed) {
  const armedList   = armed.map(p   => `  🔫 ${bold(p.name)}`).join('\n') || `  ${sans('none')}`;
  const unarmedList = unarmed.map(p => `  🚫 ${sans(p.name)}`).join('\n') || `  ${sans('none')}`;

  return `
⚔️  ${bold(`ROUND ${round}`)}
${LINE}
${bold('Armed hunters')}${sans(':')}
${armedList}

${bold('Unarmed survivors')}${sans(':')}
${unarmedList}

${LINE2}
⏳ ${sans('You have')} ${bold('30 seconds')} ${sans('to act')}
${sans('Send your move')} ${bold('in private chat with me')}${sans(':')}

/shoot — ${sans('fire at your assigned target')}
/sell   — ${sans('offer your bullet (reply with @username)')}
/wait   — ${sans('skip this round')}
`.trim();
}

function msgPrivateRoundPrompt(round, player, targetPlayer) {
  const bulletStatus = player.bullet
    ? `🔫 ${bold('LOADED')}`
    : `🚫 ${sans('No bullet')}`;

  const targetLine = targetPlayer
    ? `🎯 ${sans('Your target')}${sans(':')} ${bold(targetPlayer.name)}`
    : `🎯 ${sans('Target')}${sans(':')} ${bold('Reassigning...')}`;

  return `
${sans(`Round ${round} — your move`)}
${LINE2}
${bulletStatus}
${targetLine}

${player.bullet ? `${bold('/shoot')} — ${sans('fire at your target')}\n${bold('/sell @username')} — ${sans('sell bullet for protection')}\n${bold('/wait')} — ${sans('observe')}` : `${bold('/wait')} — ${sans('you have no bullet, survive by making deals!')}`}
`.trim();
}

// ─────────────────────────────────────
// RESOLUTION MESSAGES
// ─────────────────────────────────────

function msgRoundResults(round, events, aliveAfter) {
  let lines = [`💥 ${bold(`ROUND ${round} RESULTS`)}`, LINE];

  if (events.length === 0) {
    lines.push(`😶 ${sans('Nothing happened...')} ${sans('everyone watched each other.')}`);
  }

  for (const e of events) {
    if (e.type === 'eliminated') {
      lines.push(`☠️  ${randomKillStory(e.killerName, e.victimName)}`);
    } else if (e.type === 'bodyguard_save') {
      lines.push(`🛡️  ${bold(e.guardName)} ${sans('intercepted the shot')} — ${bold(e.shooterName)} ${sans('is eliminated!')}`);
      lines.push(`   ${sans(`${e.targetName} lives because of the deal`)}`);
    } else if (e.type === 'deal') {
      lines.push(`🤝 ${bold(e.sellerName)} ${sans('sold their bullet to')} ${bold(e.buyerName)}`);
      lines.push(`   ${sans(`${e.sellerName} becomes bodyguard for 1 round`)}`);
    } else if (e.type === 'wait') {
      lines.push(`😴 ${sans(e.playerName)} ${sans('waited and watched...')}`);
    }
  }

  lines.push(LINE2);

  const aliveLines = aliveAfter.map(p => {
    const bullet = p.bullet ? '🔫' : '🚫';
    return `  ${bullet} ${p.alive ? bold(p.name) : sans(p.name)} — ${bold(p.kills)} ${sans('kill' + (p.kills !== 1 ? 's' : ''))}`;
  });

  lines.push(`${sans('Alive')} (${bold(aliveAfter.length)})${sans(':')}`);
  lines.push(...aliveLines);

  return lines.join('\n');
}

function msgTimerWarning(seconds) {
  return `⏰ ${bold(`${seconds}s`)} ${sans('remaining to submit your action!')}`;
}

function msgAutoWait(playerName) {
  return `😴 ${bold(playerName)} ${sans('ran out of time —')} ${bold('auto-waited')} ${sans('this round.')}`;
}

// ─────────────────────────────────────
// ENDGAME MESSAGES
// ─────────────────────────────────────

function msgWinner(winner, allPlayers, rounds) {
  const sorted = [...allPlayers].sort((a, b) => b.kills - a.kills);
  const podium = sorted.slice(0, 3).map((p, i) => {
    const medal = ['🥇', '🥈', '🥉'][i];
    const status = p.alive ? bold(p.name) : sans(p.name);
    return `  ${medal} ${status} — ${bold(p.kills)} ${sans('kill' + (p.kills !== 1 ? 's' : ''))}`;
  }).join('\n');

  const unarmedSurvivor = allPlayers.find(p => p.alive && !p.bullet && !p.usedBullet && !p.soldBullet);

  let special = '';
  if (unarmedSurvivor) {
    special = `\n🏅 ${bold('UNARMED LEGEND')}${sans(':')} ${bold(unarmedSurvivor.name)} ${sans('survived without ever firing!')}`;
  }

  return `
🏆 ${bold('CHICKEN DINNER')} 🍗
${LINE}
${bold(winner.name)} ${sans('wins')} ${bold('DEAD OR ALIVE')}${sans('!')}

${sans('Survived')} ${bold(rounds)} ${sans('round' + (rounds !== 1 ? 's' : ''))}
${sans('Eliminated')} ${bold(winner.kills)} ${sans('player' + (winner.kills !== 1 ? 's' : ''))}

${LINE2}
${bold('Final Standings')}${sans(':')}
${podium}
${special}
${LINE2}
${sans('Type')} ${bold('/newgame')} ${sans('for a rematch!')}
`.trim();
}

function msgNoWinnerDraw(aliveNames) {
  return `
🤝 ${bold('STANDOFF!')}
${LINE}
${sans('Nobody has bullets left...')}

${aliveNames.map(n => `  💀 ${bold(n)}`).join('\n')}

${sans('All remaining players share the victory!')}
`.trim();
}

// ─────────────────────────────────────
// SELL / ACTION CONFIRMATIONS
// ─────────────────────────────────────

function msgShootConfirm(targetName) {
  return `🔫 ${bold('LOCKED IN')} — ${sans('firing at')} ${bold(targetName)} ${sans('this round.')}`;
}

function msgSellConfirm(buyerName) {
  return `🤝 ${bold('DEAL SET')} — ${sans('selling bullet to')} ${bold(buyerName)}${sans('.')} ${sans('You become their bodyguard.')}`;
}

function msgWaitConfirm() {
  return `😴 ${bold('Waiting')} — ${sans('you sit this round out.')}`;
}

function msgNoBullet() {
  return `🚫 ${bold('No bullet!')} ${sans('You already used or sold yours. Try')} ${bold('/wait')} ${sans('or make deals in the group!')}`;
}

function msgCantShootSelf() {
  return `❌ ${sans('You cannot shoot yourself!')}`;
}

function msgTargetNotFound() {
  return `❌ ${sans('Player not found in this game. Check the username and try again.')}`;
}

function msgTargetDead() {
  return `💀 ${sans('That player is already eliminated!')}`;
}

function msgNotInGame() {
  return `❌ ${sans('You are not in this game.')}`;
}

function msgGameNotRunning() {
  return `❌ ${sans('No game is currently running.')}`;
}

function msgOnlyInPrivate() {
  return `🔒 ${sans('Send game actions in')} ${bold('private chat with me!')} ${sans('Your moves must stay secret.')}`;
}

function msgHelp() {
  return `
🎯 ${bold('DEAD OR ALIVE')} — ${sans('Commands')}
${LINE}
${bold('Group chat')}${sans(':')}
/newgame — ${sans('open a lobby')}
/join     — ${sans('enter the match')}
/players  — ${sans('see who joined')}

${bold('Private chat')} ${sans('(during game)')}${sans(':')}
/shoot         — ${sans('fire at your secret target')}
/sell @username — ${sans('sell bullet, become bodyguard')}
/wait          — ${sans('skip this round')}

${LINE2}
${sans('Every player gets')} ${bold('ONE bullet')} ${sans('and a')} ${bold('secret target')}${sans('.')}
${sans('Use your bullet wisely — or trade it for safety.')}
`.trim();
}

function msgPlayers(players) {
  if (players.length === 0) return `${sans('No players yet. Type')} ${bold('/join')}${sans('!')}`;
  const list = players.map((p, i) => `  ${i + 1}. ${bold(p.name)}`).join('\n');
  return `👥 ${bold('Current Players')} (${bold(players.length)})${sans(':')}\n${list}`;
}


function msgWelcome(name) {
  return `
💀 ${bold('DEAD OR ALIVE')}
${LINE}
${sans('Welcome')}, ${bold(name)}${sans('!')}
${sans('You are ready to receive secret missions.')}

${LINE2}
${bold('How to play')}${sans(':')}
🎯 ${sans('Join a group game with')} ${bold('/join')}
🔫 ${sans('Get a')} ${bold('secret target')} ${sans('assigned')}
💀 ${sans('Use your')} ${bold('ONE bullet')} ${sans('wisely')}
🤝 ${sans('Make deals  •  Betray  •  Survive')}

${LINE2}
${bold('Group commands')}${sans(':')}
/newgame — ${sans('start a lobby')}
/join     — ${sans('enter the match')}
/shop     — ${sans('view items')}

${bold('Private commands')} ${sans('(during game)')}${sans(':')}
/shoot          — ${sans('fire at your target')}
/sell @username — ${sans('trade bullet for protection')}
/wait           — ${sans('skip this round')}
/myinfo         — ${sans('check your status')}
${LINE2}
👨‍💻 ${bold('Developer')}${sans(':')} @Veerarious
`.trim();
}

function msgShop() {
  return `
🛒 ${bold('DEAD OR ALIVE — SHOP')}
${LINE}
${sans('Buy items during a game!')}
${sans('Use')} ${bold('/buy <item>')} ${sans('in private chat.')}

${LINE2}
🛡️  ${bold('shield')}   — ${sans('Block one incoming shot')}
💊 ${bold('medkit')}   — ${sans('Heal 40HP (free, once per game)')}
🔍 ${bold('intel')}    — ${sans('See who is hunting YOU (free, once)')}
🎭 ${bold('disguise')} — ${sans('Hide bullet status 1 round (free, once)')}

${LINE2}
${bold('Usage')}${sans(':')}
/buy shield
/buy medkit
/buy intel
/buy disguise

⚠️ ${sans('Items are single use only!')}
`.trim();
}

function msgBuyResult(result, item) {
  if (result === 'no_game')      return `❌ ${sans('No active game found.')}`;
  if (result === 'already_used') return `⚠️ ${bold(item)} ${sans('already used this game!')}`;
  if (result === 'unknown')      return `❓ ${sans('Unknown item. See')} ${bold('/shop')}`;
  const names = { shield:'🛡️ Shield', medkit:'💊 Medkit', intel:'🔍 Intel', disguise:'🎭 Disguise' };
  return `✅ ${sans('Purchased!')} ${bold(names[item] || item)} ${sans('— activates this round!')}`;
}

function msgMyInfo(player, targetPlayer) {
  const bullet = player.bullet ? `🔫 ${bold('LOADED')}` : `🚫 ${sans('No bullet')}`;
  const target = targetPlayer  ? `🎯 ${bold(targetPlayer.name)}` : `🎯 ${sans('Reassigning...')}`;
  return `
👤 ${bold('YOUR STATUS')}
${LINE}
❤️  HP${sans(':')}${bold(String(player.hp))}
${bullet}
${target}
🗡️  ${sans('Kills:')}${bold(String(player.kills))}
`.trim();
}

module.exports = {
  msgNewGame, msgPlayerJoined, msgAlreadyJoined, msgLobbyFull,
  msgNoGame, msgGameAlreadyRunning, msgNotEnoughPlayers, msgLobbyTimeout,
  msgGameStart, msgPrivateTarget,
  msgRoundStart, msgPrivateRoundPrompt,
  msgRoundResults, msgTimerWarning, msgAutoWait,
  msgWinner, msgNoWinnerDraw,
  msgShootConfirm, msgSellConfirm, msgWaitConfirm,
  msgNoBullet, msgCantShootSelf, msgTargetNotFound, msgTargetDead,
  msgNotInGame, msgGameNotRunning, msgOnlyInPrivate,
  msgHelp, msgPlayers, msgWelcome, msgShop, msgBuyResult, msgMyInfo,
};
