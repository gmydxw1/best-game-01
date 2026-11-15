// LUMENFALL simulation. Pure state plus a fixed 1/60 s step: no DOM, no
// sound here, only events out (bit flags) so the caller can play sounds.
// The one idea: light is the weapon. Shades burn inside any light — the
// keeper's lantern or a brazier — and only there. Fuel is the clock.
import {
  BOLT_DAMAGE, BOLT_SPEED, BRAZIER_COST, ENEMY_TYPES, FUEL_DRAIN, MAX_BRAZIERS,
  MAX_WAVE, PLAYER_MAX_FUEL, PLAYER_MAX_HP, PLAYER_RADIUS, PLAYER_SPEED, RELICS,
  VIEW_H, VIEW_W, waveName, waveQueue,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WON = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_KILL = 16;
export const EVENT_PICKUP = 32;

export function createWorld(random) {
  const state = {
    time: 0, wave: 0, phase: 'fight', score: 0, kills: 0, best: 0,
    hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, fuel: PLAYER_MAX_FUEL, maxFuel: PLAYER_MAX_FUEL,
    embers: 0, relicsOwned: {}, relicChoices: [], choiceMade: false,
    player: { x: VIEW_W / 2, y: VIEW_H / 2, fireCd: 0, aimX: 1, aimY: 0 },
    bolts: [], enemies: [], braziers: [], pickups: [], particles: [], floats: [],
    spawnQueue: [], spawnTimer: 0, banner: '', bannerTimer: 0, shake: 0, boss: null,
  };

  function lightRadius() {
    const wide = (state.relicsOwned.wide || 0) * 30;
    const base = 150 + wide;
    const fuelFactor = 0.55 + 0.45 * (state.fuel / state.maxFuel);
    return Math.max(70, base * fuelFactor);
  }

  function brazierRadius() {
    return 140 * (1 + 0.4 * (state.relicsOwned.brazier || 0));
  }

  function brazierBurn() {
    return 4 + (state.relicsOwned.brazier || 0);
  }

  function inLight(x, y) {
    const p = state.player;
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < lightRadius() * lightRadius()) return true;
    const r = brazierRadius();
    for (const b of state.braziers) {
      const bx = x - b.x;
      const by = y - b.y;
      if (bx * bx + by * by < r * r) return true;
    }
    return false;
  }

  function addFloat(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 1 });
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i += 1) {
      const a = random.next() * Math.PI * 2;
      const sp = 40 + random.next() * 160;
      state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + random.next() * 0.4, color, size: 2 + random.next() * 3 });
    }
  }

  function spawnEnemy(kind) {
    const type = ENEMY_TYPES[kind];
    const edge = Math.floor(random.next() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = random.range(40, VIEW_W - 40); y = -30; }
    if (edge === 1) { x = random.range(40, VIEW_W - 40); y = VIEW_H + 30; }
    if (edge === 2) { x = -30; y = random.range(40, VIEW_H - 40); }
    if (edge === 3) { x = VIEW_W + 30; y = random.range(40, VIEW_H - 40); }
    const hpBonus = kind === 'warden' ? (state.wave >= MAX_WAVE ? 25 : 0) : Math.floor(state.wave / 3);
    const enemy = {
      kind, x, y, hp: type.hp + hpBonus, maxHp: type.hp + hpBonus,
      speed: type.speed * (1 + state.wave * 0.02), radius: type.radius,
      burn: 0, slow: 0, hitCd: 0, spawnTimer: kind === 'warden' ? 4 : 0,
    };
    state.enemies.push(enemy);
    if (kind === 'warden') state.boss = enemy;
    return enemy;
  }

  function dropEmbers(x, y, n) {
    for (let i = 0; i < n; i += 1) {
      state.pickups.push({ x: x + random.range(-24, 24), y: y + random.range(-24, 24), vx: 0, vy: 0, kind: 'ember' });
    }
  }

  function killEnemy(enemy, index) {
    const type = ENEMY_TYPES[enemy.kind];
    state.enemies.splice(index, 1);
    if (state.boss === enemy) state.boss = null;
    state.kills += 1;
    state.score += type.score;
    addFloat(enemy.x, enemy.y - 18, `+${type.score}`, '#ffd27a');
    burst(enemy.x, enemy.y, '#ffb347', enemy.kind === 'warden' ? 26 : 10);
    if (enemy.kind === 'warden') { dropEmbers(enemy.x, enemy.y, 10); state.shake = 12; }
    else if (enemy.kind === 'brute') dropEmbers(enemy.x, enemy.y, 3);
    else if (random.next() < 0.7) dropEmbers(enemy.x, enemy.y, 1);
  }

  function startWave(wave) {
    state.wave = wave;
    state.phase = 'fight';
    state.spawnQueue = waveQueue(wave, random);
    state.spawnTimer = 0.5;
    state.banner = waveName(wave);
    state.bannerTimer = 2.2;
  }

  function offerRelics() {
    const pool = [...RELICS];
    const choices = [];
    while (choices.length < 3 && pool.length > 0) {
      const i = Math.floor(random.next() * pool.length);
      const relic = pool.splice(i, 1)[0];
      if ((state.relicsOwned[relic.id] || 0) < 3) choices.push(relic);
    }
    state.relicChoices = choices;
    state.phase = 'choice';
    state.choiceMade = false;
  }

  function chooseRelic(index) {
    const relic = state.relicChoices[index];
    if (!relic || state.phase !== 'choice') return false;
    state.relicsOwned[relic.id] = (state.relicsOwned[relic.id] || 0) + 1;
    if (relic.id === 'heart') {
      state.maxHp += 25;
      state.hp = Math.min(state.maxHp, state.hp + 25);
    }
    state.phase = 'fight';
    state.choiceMade = true;
    if (state.wave >= MAX_WAVE) { state.phase = 'won'; return true; }
    startWave(state.wave + 1);
    return true;
  }

  function placeBrazier(x, y) {
    if (state.phase !== 'fight') return false;
    if (state.embers < BRAZIER_COST || state.braziers.length >= MAX_BRAZIERS) return false;
    if (x < 60 || x > VIEW_W - 60 || y < 90 || y > VIEW_H - 40) return false;
    const p = state.player;
    if (Math.hypot(x - p.x, y - p.y) < 90) return false;
    for (const b of state.braziers) if (Math.hypot(x - b.x, y - b.y) < 110) return false;
    state.embers -= BRAZIER_COST;
    state.braziers.push({ x, y, flicker: random.next() * 10 });
    burst(x, y, '#ffd27a', 14);
    return true;
  }

  function reset() {
    state.time = 0; state.wave = 0; state.phase = 'fight'; state.score = 0; state.kills = 0;
    state.hp = PLAYER_MAX_HP; state.maxHp = PLAYER_MAX_HP;
    state.fuel = PLAYER_MAX_FUEL; state.maxFuel = PLAYER_MAX_FUEL;
    state.embers = 0; state.relicsOwned = {}; state.relicChoices = []; state.choiceMade = false;
    state.player.x = VIEW_W / 2; state.player.y = VIEW_H / 2; state.player.fireCd = 0;
    state.bolts = []; state.enemies = []; state.braziers = []; state.pickups = [];
    state.particles = []; state.floats = []; state.spawnQueue = []; state.spawnTimer = 0;
    state.banner = ''; state.bannerTimer = 0; state.shake = 0; state.boss = null;
    startWave(1);
  }

  // input: {dx, dy, aimX, aimY, firing, buildAt} — buildAt is a point or null.
  function step(dt, input, attract) {
    let events = 0;
    state.time += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    for (const f of state.floats) { f.y -= 30 * dt; f.life -= dt; }
    state.floats = state.floats.filter((f) => f.life > 0);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
    state.particles = state.particles.filter((p) => p.life > 0);

    const p = state.player;
    if (attract) {
      // Title screen: the keeper wanders in a slow circle while shades drift.
      p.x = VIEW_W / 2 + Math.cos(state.time * 0.25) * 180;
      p.y = VIEW_H / 2 + Math.sin(state.time * 0.25) * 110;
      if (state.enemies.length < 5 && random.next() < 0.02) spawnEnemy(random.pick(['wisp', 'shade']));
    } else if (state.phase === 'fight') {
      p.x = Math.max(24, Math.min(VIEW_W - 24, p.x + input.dx * PLAYER_SPEED * dt));
      p.y = Math.max(84, Math.min(VIEW_H - 24, p.y + input.dy * PLAYER_SPEED * dt));
      const aimDx = input.aimX - p.x;
      const aimDy = input.aimY - p.y;
      const aimLen = Math.hypot(aimDx, aimDy) || 1;
      p.aimX = aimDx / aimLen;
      p.aimY = aimDy / aimLen;

      // Fuel is the clock: it drains, embers refill it, braziers slow the bleed.
      const nearBrazier = state.braziers.some((b) => Math.hypot(p.x - b.x, p.y - b.y) < 200);
      const drain = FUEL_DRAIN * (state.relicsOwned.thrifty ? 0.5 : 1) * (nearBrazier ? 0.6 : 1);
      state.fuel = Math.max(0, state.fuel - drain * dt);
      if (state.fuel <= 0) {
        state.hp -= 4 * dt;
        if (state.hp <= 0) { state.hp = 0; state.phase = 'lost'; return events | EVENT_OVER; }
      }
      if (nearBrazier) state.fuel = Math.min(state.maxFuel, state.fuel + 1.5 * dt);

      // Fire ember bolts toward the mouse.
      p.fireCd -= dt;
      if (input.firing && p.fireCd <= 0) {
        const count = 1 + (state.relicsOwned.twin || 0);
        const spread = count > 1 ? 0.14 : 0;
        for (let i = 0; i < count; i += 1) {
          const off = (i - (count - 1) / 2) * spread;
          const cos = Math.cos(off);
          const sin = Math.sin(off);
          const ax = p.aimX * cos - p.aimY * sin;
          const ay = p.aimX * sin + p.aimY * cos;
          state.bolts.push({ x: p.x + ax * 24, y: p.y + ay * 24, vx: ax * BOLT_SPEED, vy: ay * BOLT_SPEED, life: 1.1 });
        }
        p.fireCd = 0.3 * Math.pow(0.75, state.relicsOwned.swift || 0);
      }
      if (input.buildAt) placeBrazier(input.buildAt.x, input.buildAt.y);

      // Spawn the wave, one shade at a time.
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnEnemy(state.spawnQueue.shift());
          state.spawnTimer = Math.max(0.25, 0.85 - state.wave * 0.05);
        }
      }
    }

    // Bolts fly and hit.
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const b = state.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.x > VIEW_W || b.y < 0 || b.y > VIEW_H;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const e = state.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 6) {
            e.hp -= BOLT_DAMAGE;
            if (state.relicsOwned.frost) e.slow = 2;
            burst(b.x, b.y, '#ffd27a', 4);
            if (e.hp <= 0) { killEnemy(e, j); events |= EVENT_KILL; }
            dead = true;
            break;
          }
        }
      }
      if (dead) state.bolts.splice(i, 1);
    }

    // Enemies hunt the keeper, burn in the light, and bite on contact.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (e.hitCd > 0) e.hitCd -= dt;
      if (e.slow > 0) e.slow -= dt;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const slowFactor = e.slow > 0 ? 0.65 : 1;
      e.x += (dx / dist) * e.speed * slowFactor * dt;
      e.y += (dy / dist) * e.speed * slowFactor * dt;
      if (inLight(e.x, e.y)) {
        const burn = e.kind === 'warden' ? 1.5 : 3;
        e.hp -= burn * dt;
        e.burn = 0.15;
        if (e.hp <= 0) { killEnemy(e, i); events |= EVENT_KILL; continue; }
      } else if (e.burn > 0) e.burn -= dt;
      if (e.kind === 'warden') {
        e.spawnTimer -= dt;
        if (e.spawnTimer <= 0) { e.spawnTimer = 4; spawnEnemy('wisp'); spawnEnemy('wisp'); }
      }
      if (dist < e.radius + PLAYER_RADIUS && e.hitCd <= 0 && state.phase === 'fight' && !attract) {
        const type = ENEMY_TYPES[e.kind];
        state.hp -= type.touch;
        state.shake = 7;
        e.hitCd = 0.8;
        burst(p.x, p.y, '#ff6b6b', 8);
        events |= EVENT_HIT;
        if (e.kind !== 'brute' && e.kind !== 'warden') {
          killEnemy(e, i);
          continue;
        }
        if (state.hp <= 0) {
          state.hp = 0;
          state.phase = 'lost';
          return events | EVENT_OVER;
        }
      }
    }
    if (state.hp <= 0 && state.phase === 'fight' && !attract) {
      state.hp = 0;
      state.phase = 'lost';
      return events | EVENT_OVER;
    }

    // Embers drift to the keeper (faster with the magnet relic).
    const magnetR = 70 * (1 + (state.relicsOwned.magnet || 0));
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pk = state.pickups[i];
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnetR) { pk.x += (dx / dist) * 260 * dt; pk.y += (dy / dist) * 260 * dt; }
      if (dist < PLAYER_RADIUS + 10) {
        state.pickups.splice(i, 1);
        state.embers += 1;
        state.fuel = Math.min(state.maxFuel, state.fuel + 3);
        state.score += 5;
        events |= EVENT_PICKUP;
      }
    }

    // Wave cleared: draft a relic, or win after wave 10.
    if (state.phase === 'fight' && !attract && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      state.score += 100 * state.wave;
      if (state.wave >= MAX_WAVE) {
        state.phase = 'won';
        return events | EVENT_WON;
      }
      offerRelics();
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  return {
    state,
    reset,
    startWave,
    chooseRelic,
    placeBrazier,
    step,
    lightRadius,
    brazierRadius,
  };
}
