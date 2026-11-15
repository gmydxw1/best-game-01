// LUMENFALL — Keeper of the Last Light. All tuning lives here so a balance
// change is one number, never a hunt through the simulation.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'lumenfall-best';
export const MAX_WAVE = 10;
export const BRAZIER_COST = 25;
export const MAX_BRAZIERS = 6;
export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 265;
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_FUEL = 100;
export const FUEL_DRAIN = 1.1;
export const BOLT_SPEED = 560;
export const BOLT_DAMAGE = 1;

// Enemy kinds. hp grows a little with the wave; speed and score are fixed
// so the player can learn each silhouette at a glance.
export const ENEMY_TYPES = {
  wisp: { hp: 1, speed: 92, radius: 11, score: 10, touch: 7, color: '#b78cff', eye: '#e9dcff' },
  shade: { hp: 2, speed: 62, radius: 15, score: 20, touch: 10, color: '#7a5cff', eye: '#ffd27a' },
  brute: { hp: 5, speed: 38, radius: 24, score: 50, touch: 14, color: '#4c2fb3', eye: '#ff6b6b' },
  warden: { hp: 40, speed: 42, radius: 36, score: 500, touch: 18, color: '#2a165e', eye: '#ff4757' },
};

// Relics offered between waves. Each can stack three times; the draft is
// the roguelite half of the game: the build, not the reflexes, wins wave 10.
export const RELICS = [
  { id: 'wide', name: 'Wide Flame', desc: '+30 light radius. Your light reaches further, and shades burn sooner.' },
  { id: 'swift', name: 'Swift Bolts', desc: 'Ember bolts fire 25% faster. Hold the mouse and keep the dark at bay.' },
  { id: 'twin', name: 'Twin Shot', desc: '+1 ember bolt per shot. Two flames are better than one.' },
  { id: 'magnet', name: 'Ember Magnet', desc: 'Embers fly to you from twice as far. Fuel finds the keeper.' },
  { id: 'heart', name: 'Thick Flame', desc: '+25 max health and heal 25 now. A sturdier lantern.' },
  { id: 'brazier', name: 'Brazier Mastery', desc: 'Braziers burn +40% wider and +1 damage. Your little suns grow up.' },
  { id: 'thrifty', name: 'Fuel Saver', desc: 'Fuel drains half as fast. The night lasts longer, so must you.' },
  { id: 'frost', name: 'Frost Embers', desc: 'Bolts chill shades, slowing them 35% for 2 seconds.' },
];

// How a wave is built: a queue of kinds, boss first on waves 5 and 10.
export function waveQueue(wave, random) {
  const queue = [];
  if (wave === 5 || wave === MAX_WAVE) queue.push('warden');
  const count = 5 + wave * 3;
  for (let i = 0; i < count; i += 1) {
    const roll = random.next();
    if (wave >= 4 && roll < 0.16) queue.push('brute');
    else if (roll < 0.45) queue.push('shade');
    else queue.push('wisp');
  }
  // Shuffle everything after the boss so the wave never feels scripted.
  for (let i = queue.length - 1; i > 1; i -= 1) {
    const j = 1 + Math.floor(random.next() * i);
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export function waveName(wave) {
  if (wave === MAX_WAVE) return `Wave ${wave} — THE WARDEN`;
  if (wave === 5) return `Wave ${wave} — Warden stirs`;
  return `Wave ${wave} of ${MAX_WAVE}`;
}
