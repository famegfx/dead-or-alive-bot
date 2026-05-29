// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GAME STATE MANAGER
// One game state per group chat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GAME_STATUS = {
  IDLE:    'idle',
  LOBBY:   'lobby',
  PLAYING: 'playing',
  ENDED:   'ended',
};

// All active games: chatId → gameState
const games = new Map();

/**
 * Create a fresh game for a group
 */
function createGame(chatId, startedBy) {
  const game = {
    chatId,
    startedBy,
    status: GAME_STATUS.LOBBY,
    players: new Map(),   // userId → playerObj
    round: 0,
    roundTimer: null,
    actionTimer: null,
    pendingActions: new Map(), // userId → action obj
    eliminationOrder: [],
    createdAt: Date.now(),
  };
  games.set(chatId, game);
  return game;
}

/**
 * Add a player to lobby
 */
function addPlayer(chatId, user) {
  const game = games.get(chatId);
  if (!game || game.status !== GAME_STATUS.LOBBY) return null;
  if (game.players.has(user.id)) return 'already_joined';
  if (game.players.size >= 12) return 'full';

  game.players.set(user.id, {
    id:       user.id,
    name:     user.first_name || user.username || `Player${user.id}`,
    username: user.username ? `@${user.username}` : user.first_name,
    hp:       100,
    bullet:   true,   // everyone starts with 1 bullet
    target:   null,   // assigned at game start
    alive:    true,
    kills:    0,
    survived: 0,
    bodyguard: null,  // userId of bodyguard if any
    isBodyguarding: null, // userId they are protecting
    usedBullet: false,
    soldBullet: false,
  });
  return 'joined';
}

/**
 * Assign secret circular targets to all players
 * Ali→Sara→Mike→John→...→Ali
 */
function assignTargets(chatId) {
  const game = games.get(chatId);
  const playerIds = [...game.players.keys()];

  // Shuffle
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }

  // Circular assignment
  playerIds.forEach((id, idx) => {
    const targetId = playerIds[(idx + 1) % playerIds.length];
    game.players.get(id).target = targetId;
  });
}

/**
 * Start the game
 */
function startGame(chatId) {
  const game = games.get(chatId);
  if (!game) return null;
  game.status = GAME_STATUS.PLAYING;
  game.round = 1;
  assignTargets(chatId);
  return game;
}

/**
 * Get alive players array
 */
function alivePlayers(chatId) {
  const game = games.get(chatId);
  if (!game) return [];
  return [...game.players.values()].filter(p => p.alive);
}

/**
 * Get player by userId
 */
function getPlayer(chatId, userId) {
  const game = games.get(chatId);
  if (!game) return null;
  return game.players.get(userId) || null;
}

/**
 * Submit a player action for the round
 * action = { type: 'shoot'|'sell'|'wait', targetId? }
 */
function submitAction(chatId, userId, action) {
  const game = games.get(chatId);
  if (!game || game.status !== GAME_STATUS.PLAYING) return false;
  const player = game.players.get(userId);
  if (!player || !player.alive) return false;
  game.pendingActions.set(userId, action);
  return true;
}

/**
 * Resolve all actions for the round
 * Returns array of events (for narration)
 */
function resolveRound(chatId) {
  const game = games.get(chatId);
  if (!game) return [];

  const events   = [];
  const alive    = alivePlayers(chatId);
  const actions  = game.pendingActions;

  // ── Process SHOOT actions first ──
  const shootActions = [...actions.entries()]
    .filter(([, a]) => a.type === 'shoot');

  // Track who gets shot this round (for bodyguard check)
  const shotTargets = new Map(); // targetId → shooterId[]

  for (const [shooterId, action] of shootActions) {
    const shooter = game.players.get(shooterId);
    if (!shooter || !shooter.alive || !shooter.bullet) continue;

    const targetId = shooter.target; // can only shoot assigned target
    const target   = game.players.get(targetId);
    if (!target || !target.alive) continue;

    if (!shotTargets.has(targetId)) shotTargets.set(targetId, []);
    shotTargets.get(targetId).push(shooterId);
  }

  // Resolve each shot
  for (const [targetId, shooterIds] of shotTargets) {
    const target  = game.players.get(targetId);
    const shooter = game.players.get(shooterIds[0]);
    if (!target || !target.alive || !shooter) continue;

    // Use the bullet
    shooter.bullet    = false;
    shooter.usedBullet = true;

    // Bodyguard check
    if (target.bodyguard) {
      const guard = game.players.get(target.bodyguard);
      if (guard && guard.alive && guard.bullet) {
        // Bodyguard intercepts + fires back
        guard.bullet = false;
        shooter.alive = false;
        shooter.hp = 0;
        game.eliminationOrder.unshift(shooter.id);
        guard.kills++;
        target.bodyguard = null;
        guard.isBodyguarding = null;

        events.push({
          type: 'bodyguard_save',
          guardName:   guard.username,
          targetName:  target.username,
          shooterName: shooter.username,
        });
        continue;
      }
    }

    // Normal elimination
    target.alive = false;
    target.hp    = 0;
    game.eliminationOrder.unshift(target.id);
    shooter.kills++;

    // Reassign hunter: new target = the killer
    // Find who was hunting the shooter and reassign them to shooter's NEW target
    // Chain: if Sara dies, Ali (who hunted Sara) now hunts Sara's target
    const sarasTarget = target.target;
    shooter.target = sarasTarget; // shooter inherits victim's target

    // Also: whoever was hunting the SHOOTER now targets the SHOOTER's new target
    // (to avoid orphan chains)
    for (const [pid, p] of game.players) {
      if (p.alive && p.target === targetId) {
        p.target = sarasTarget || shooter.id;
      }
    }

    events.push({
      type:        'eliminated',
      killerName:  shooter.username,
      victimName:  target.username,
      killerId:    shooter.id,
      victimId:    target.id,
    });
  }

  // ── Process SELL actions ──
  const sellActions = [...actions.entries()]
    .filter(([, a]) => a.type === 'sell');

  for (const [sellerId, action] of sellActions) {
    const seller = game.players.get(sellerId);
    const buyer  = game.players.get(action.buyerId);
    if (!seller || !seller.alive || !seller.bullet) continue;
    if (!buyer  || !buyer.alive) continue;

    seller.bullet    = false;
    seller.soldBullet = true;
    buyer.bullet     = true; // buyer now has (or still has) a bullet

    // Bodyguard deal: seller protects buyer for this round
    seller.isBodyguarding = buyer.id;
    buyer.bodyguard       = seller.id;

    events.push({
      type:       'deal',
      sellerName: seller.username,
      buyerName:  buyer.username,
    });
  }

  // ── WAIT / AFK ──
  const allAlive = alivePlayers(chatId);
  for (const p of allAlive) {
    if (!actions.has(p.id)) {
      events.push({ type: 'wait', playerName: p.username });
    }
    // Reset bodyguard after round resolves
    p.bodyguard       = null;
    p.isBodyguarding  = null;
  }

  // Clear actions for next round
  game.pendingActions.clear();
  game.round++;

  return events;
}

/**
 * Check win condition
 * Returns winner player or null
 */
function checkWinner(chatId) {
  const alive = alivePlayers(chatId);
  if (alive.length === 1) return alive[0];

  // Also win if only unarmed players remain (no one can shoot)
  const armed = alive.filter(p => p.bullet);
  if (armed.length === 0 && alive.length > 0) {
    // Most kills wins
    alive.sort((a, b) => b.kills - a.kills);
    return alive[0];
  }
  return null;
}

/**
 * End the game
 */
function endGame(chatId) {
  const game = games.get(chatId);
  if (!game) return;
  if (game.roundTimer)  clearTimeout(game.roundTimer);
  if (game.actionTimer) clearTimeout(game.actionTimer);
  game.status = GAME_STATUS.ENDED;
  setTimeout(() => games.delete(chatId), 60_000); // cleanup after 1 min
}

function getGame(chatId)  { return games.get(chatId) || null; }
function gameExists(chatId) { return games.has(chatId); }

module.exports = {
  GAME_STATUS,
  createGame,
  addPlayer,
  startGame,
  alivePlayers,
  getPlayer,
  getGame,
  gameExists,
  submitAction,
  resolveRound,
  checkWinner,
  endGame,
};
