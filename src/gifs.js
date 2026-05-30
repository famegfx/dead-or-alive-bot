// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANIME GIFs — Dead Or Alive Bot
// All GIFs are public Tenor/Giphy links
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Pick a random item from an array
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ─────────────────────────────────────
// 🪂 GAME START — parachute / battle ready
// ─────────────────────────────────────
const GAME_START = [
  'https://media.tenor.com/x8v1oNUOmg4AAAAC/anime-fight.gif',
  'https://media.tenor.com/TzY8hKCEgkYAAAAC/demon-slayer-kimetsu-no-yaiba.gif',
  'https://media.tenor.com/3q3N2xo2GAsAAAAC/anime-ready.gif',
  'https://media.tenor.com/BLQdpYhzFzwAAAAC/anime-sword.gif',
  'https://media.tenor.com/OKVBAvJ8x_EAAAAC/demon-slayer.gif',
];

// ─────────────────────────────────────
// 🔫 KILL / SHOT FIRED
// ─────────────────────────────────────
const KILL = [
  'https://media.tenor.com/BoShwSGGm3UAAAAC/anime-shoot.gif',
  'https://media.tenor.com/Cy7Y_8TOvdcAAAAC/anime-gun.gif',
  'https://media.tenor.com/xnYpVJoNJpYAAAAC/anime-sniper.gif',
  'https://media.tenor.com/6VkKOixRbGsAAAAC/assassination-classroom.gif',
  'https://media.tenor.com/I9XkKKZKs44AAAAC/anime-bang.gif',
];

// ─────────────────────────────────────
// ☠️ PLAYER ELIMINATED
// ─────────────────────────────────────
const ELIMINATED = [
  'https://media.tenor.com/kHCGDrPDM8EAAAAC/anime-death.gif',
  'https://media.tenor.com/p9BHBMEkSysAAAAC/anime-eliminated.gif',
  'https://media.tenor.com/WdN2YncJEv0AAAAC/one-piece-death.gif',
  'https://media.tenor.com/U6j6e0C5WtwAAAAC/naruto-die.gif',
  'https://media.tenor.com/5bMhUntTRxIAAAAC/anime-fall.gif',
];

// ─────────────────────────────────────
// 🛡️ BODYGUARD SAVE
// ─────────────────────────────────────
const BODYGUARD = [
  'https://media.tenor.com/0LFcbQE1f1AAAAAC/anime-protect.gif',
  'https://media.tenor.com/sA5sYpfnSzcAAAAC/anime-shield.gif',
  'https://media.tenor.com/xfH9VWmqHgkAAAAC/my-hero-academia-anime.gif',
  'https://media.tenor.com/w0s8dRFVuSgAAAAC/anime-block.gif',
];

// ─────────────────────────────────────
// 🤝 DEAL / SELL
// ─────────────────────────────────────
const DEAL = [
  'https://media.tenor.com/HcoiLlJWaUoAAAAC/anime-handshake.gif',
  'https://media.tenor.com/Kp3RhfhFJ9sAAAAC/anime-deal.gif',
  'https://media.tenor.com/X7JJM_g4TSEAAAAC/spy-family-anime.gif',
  'https://media.tenor.com/JHvZz8pU3CMAAAAC/anime-smile-nod.gif',
];

// ─────────────────────────────────────
// 🏆 WINNER / CHICKEN DINNER
// ─────────────────────────────────────
const WINNER = [
  'https://media.tenor.com/FP0tJ1d7BSEAAAAC/anime-win.gif',
  'https://media.tenor.com/cHFNNKfPj0MAAAAC/anime-victory.gif',
  'https://media.tenor.com/RUmGkMCJFDoAAAAC/demon-slayer-victory.gif',
  'https://media.tenor.com/x9FMRcrFvOYAAAAC/anime-champion.gif',
  'https://media.tenor.com/mG4fNdNSolEAAAAC/one-piece-luffy.gif',
];

// ─────────────────────────────────────
// 🔵 BLUE ZONE WARNING
// ─────────────────────────────────────
const BLUE_ZONE = [
  'https://media.tenor.com/JZMDzqCe7ZEAAAAC/anime-run.gif',
  'https://media.tenor.com/LlEeqiM_fUAAAAAC/anime-running-away.gif',
  'https://media.tenor.com/6rWxmN6BVDEAAAAC/naruto-run.gif',
  'https://media.tenor.com/G5KhW3ktrBkAAAAC/anime-escape.gif',
];

// ─────────────────────────────────────
// 🎁 AIRDROP / SPECIAL EVENT
// ─────────────────────────────────────
const AIRDROP = [
  'https://media.tenor.com/AZMIqc4FKZMAAAAC/anime-gift.gif',
  'https://media.tenor.com/Nz0EGHuHB3UAAAAC/spy-family-anya.gif',
  'https://media.tenor.com/0gjNLvVBsN8AAAAC/anime-surprise.gif',
  'https://media.tenor.com/1kLuoK4B7WAAAAAC/anime-excited.gif',
];

// ─────────────────────────────────────
// 😴 WAIT / AFK
// ─────────────────────────────────────
const WAIT = [
  'https://media.tenor.com/PmLb0CNXQ6MAAAAC/anime-waiting.gif',
  'https://media.tenor.com/s-oHWWFPPrsAAAAC/anime-bored.gif',
  'https://media.tenor.com/jbLInXgFaq8AAAAC/anime-sleep.gif',
];

// ─────────────────────────────────────
// 🛒 SHOP
// ─────────────────────────────────────
const SHOP = [
  'https://media.tenor.com/FuALiB0TCLMAAAAC/anime-shop.gif',
  'https://media.tenor.com/vLRTRHI3-HMAAAAC/spy-family-anya-excited.gif',
  'https://media.tenor.com/kL1yHl_7EQAAAAAC/anime-buy.gif',
];

// ─────────────────────────────────────
// 🎯 SECRET TARGET / MISSION
// ─────────────────────────────────────
const TARGET = [
  'https://media.tenor.com/b-A0lsYLvGYAAAAC/assassination-classroom-karma.gif',
  'https://media.tenor.com/nO_vdkLCrIUAAAAC/anime-spy.gif',
  'https://media.tenor.com/Gy0y_L5XBkYAAAAC/anime-target.gif',
  'https://media.tenor.com/9y3_M1t49NAAAAAC/spy-family-loid.gif',
];

// ─────────────────────────────────────
// ⚔️ ROUND START
// ─────────────────────────────────────
const ROUND_START = [
  'https://media.tenor.com/nvNwIj8OuXoAAAAC/anime-fight-start.gif',
  'https://media.tenor.com/C_hTfvJpwAoAAAAC/demon-slayer-tanjiro.gif',
  'https://media.tenor.com/h4Rh7Q2yd2MAAAAC/anime-battle.gif',
  'https://media.tenor.com/xSlHPQTBt9EAAAAC/jujutsu-kaisen.gif',
  'https://media.tenor.com/a7YFJGjEKlIAAAAC/attack-on-titan.gif',
];

// ─────────────────────────────────────
// 🔚 FINAL 2 — CLIMAX
// ─────────────────────────────────────
const FINAL_TWO = [
  'https://media.tenor.com/H9CkHBT2FVEAAAAC/anime-final-battle.gif',
  'https://media.tenor.com/lHgH8RLEcF4AAAAC/demon-slayer-fight.gif',
  'https://media.tenor.com/YwUi_FTq4bYAAAAC/jujutsu-kaisen-gojo.gif',
  'https://media.tenor.com/nFLWjDcZsyIAAAAC/attack-on-titan-levi.gif',
];

module.exports = {
  gameStart:   () => pick(GAME_START),
  kill:        () => pick(KILL),
  eliminated:  () => pick(ELIMINATED),
  bodyguard:   () => pick(BODYGUARD),
  deal:        () => pick(DEAL),
  winner:      () => pick(WINNER),
  blueZone:    () => pick(BLUE_ZONE),
  airdrop:     () => pick(AIRDROP),
  wait:        () => pick(WAIT),
  shop:        () => pick(SHOP),
  target:      () => pick(TARGET),
  roundStart:  () => pick(ROUND_START),
  finalTwo:    () => pick(FINAL_TWO),
};
