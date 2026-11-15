// Canvas painter. One job: make the game read at a glance, even shrunk to a
// contact sheet. Dark field, warm gold light, purple shades, big type.
import { ENEMY_TYPES, PLAYER_RADIUS, VIEW_H, VIEW_W } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CHOICE = 'choice';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export function choiceCardRects() {
  const w = 300;
  const h = 210;
  const gap = 28;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW_W - total) / 2;
  const y = 300;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h }));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(str, x, y, size, color, align, weight) {
    ctx.fillStyle = color;
    ctx.font = `${weight || 700} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0b1026');
    g.addColorStop(1, '#070a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Faint stars and drifting motes, so the dark is never flat black.
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 70; i += 1) {
      const x = (i * 173.3) % VIEW_W;
      const y = (i * 97.7) % VIEW_H;
      const tw = 0.5 + 0.5 * Math.sin(state.time * 1.3 + i);
      ctx.globalAlpha = 0.12 + 0.2 * tw;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(120,140,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= VIEW_W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
    for (let y = 80; y <= VIEW_H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke(); }
  }

  function drawLight(x, y, radius, alpha) {
    const g = ctx.createRadialGradient(x, y, 8, x, y, radius);
    g.addColorStop(0, `rgba(255, 200, 90, ${alpha})`);
    g.addColorStop(0.55, `rgba(255, 160, 60, ${alpha * 0.45})`);
    g.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBraziers(state, lightR, brazierR) {
    for (const b of state.braziers) {
      const flick = 1 + 0.08 * Math.sin(state.time * 6 + b.flicker);
      drawLight(b.x, b.y, brazierR * flick, 0.5);
      ctx.fillStyle = '#3a2a12';
      ctx.beginPath(); ctx.arc(b.x, b.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(b.x, b.y - 4, 9 + 2 * Math.sin(state.time * 5 + b.flicker), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(b.x, b.y - 5, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawPickups(state) {
    for (const pk of state.pickups) {
      const bob = Math.sin(state.time * 4 + pk.x) * 2;
      ctx.fillStyle = '#ff9f1c';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawEnemies(state) {
    for (const e of state.enemies) {
      const type = ENEMY_TYPES[e.kind];
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.burn > 0) {
        ctx.fillStyle = 'rgba(255,180,60,0.35)';
        ctx.beginPath(); ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = type.color;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Horns on brutes, a crown on the warden: silhouettes you can tell apart.
      if (e.kind === 'brute' || e.kind === 'warden') {
        ctx.fillStyle = '#1c0f3d';
        ctx.beginPath(); ctx.moveTo(-e.radius * 0.7, -e.radius * 0.6); ctx.lineTo(-e.radius * 0.3, -e.radius * 1.3); ctx.lineTo(0, -e.radius * 0.6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(e.radius * 0.7, -e.radius * 0.6); ctx.lineTo(e.radius * 0.3, -e.radius * 1.3); ctx.lineTo(0, -e.radius * 0.6); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = type.eye;
      ctx.beginPath(); ctx.arc(-e.radius * 0.35, -2, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.radius * 0.35, -2, 3.2, 0, Math.PI * 2); ctx.fill();
      if (e.maxHp > 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-e.radius, -e.radius - 12, e.radius * 2, 5);
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(-e.radius, -e.radius - 12, (e.radius * 2 * e.hp) / e.maxHp, 5);
      }
      ctx.restore();
    }
  }

  function drawPlayer(state, lightR) {
    const p = state.player;
    drawLight(p.x, p.y, lightR, 0.55);
    ctx.save();
    ctx.translate(p.x, p.y);
    // The keeper: a hooded figure carrying the lantern, drawn in code.
    ctx.fillStyle = '#2b3a67';
    ctx.beginPath(); ctx.arc(0, 2, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath(); ctx.arc(0, -2, 8, 0, Math.PI * 2); ctx.fill();
    // Lantern swings toward the aim.
    const lx = p.aimX * 22;
    const ly = p.aimY * 22;
    ctx.strokeStyle = '#8a6d2f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBolts(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.bolts) {
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const f of state.floats) {
      ctx.globalAlpha = Math.max(0, f.life);
      text(f.text, f.x, f.y, 15, f.color, 'center', 800);
    }
    ctx.globalAlpha = 1;
  }

  function bar(x, y, w, h, frac, fill, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = fill;
    if (frac > 0) { roundRect(x + 2, y + 2, (w - 4) * Math.max(0, Math.min(1, frac)), h - 4, 4); ctx.fill(); }
    if (label) text(label, x + w / 2, y + h / 2 + 0.5, 12, '#fff', 'center', 800);
  }

  function drawHud(state, best, placeMode, screen) {
    ctx.fillStyle = 'rgba(5,8,20,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 64);
    text(`WAVE ${state.wave} / 10`, 24, 32, 20, '#ffd27a', 'left', 800);
    text(`SCORE ${state.score}`, 220, 32, 20, '#ffffff', 'left', 800);
    text(`BEST ${Math.max(best, state.score)}`, 420, 32, 16, '#9fb0ff', 'left', 600);
    bar(560, 20, 170, 24, state.hp / state.maxHp, '#ff5d5d', `HP ${Math.ceil(state.hp)}`);
    bar(745, 20, 170, 24, state.fuel / state.maxFuel, '#ffb347', `FUEL ${Math.ceil(state.fuel)}`);
    text(`◆ ${state.embers} embers`, 950, 32, 18, '#ffe66d', 'left', 800);
    text(`Braziers ${state.braziers.length}/6 · [B] build`, 1256, 32, 15, placeMode ? '#ffd27a' : '#c7d0ff', 'right', 700);
    if (state.boss) {
      bar(440, 72, 400, 12, state.boss.hp / state.boss.maxHp, '#ff4757', '');
      text('THE WARDEN', 640, 96, 13, '#ff8fa3', 'center', 800);
    }
    if (screen !== SCREEN_CHOICE && screen !== SCREEN_OVER && screen !== SCREEN_VICTORY && state.bannerTimer > 0 && state.banner) {
      ctx.globalAlpha = Math.min(1, state.bannerTimer);
      text(state.banner, VIEW_W / 2, 130, 34, '#ffd27a', 'center', 900);
      ctx.globalAlpha = 1;
    }
    text('WASD move · Mouse aim · Click / Space fire · B build brazier · P pause · M mute', VIEW_W / 2, VIEW_H - 16, 13, 'rgba(200,210,255,0.65)', 'center', 500);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(6,9,22,0.88)';
    roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,122,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(4,6,16,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('LUMENFALL', VIEW_W / 2, 190, 84, '#ffd27a', 'center', 900);
    text('Keeper of the Last Light', VIEW_W / 2, 248, 28, '#e8ecff', 'center', 600);
    text('The dark is coming. Your lantern is the only weapon.', VIEW_W / 2, 292, 18, '#b9c4f5', 'center', 500);
    panel(VIEW_W / 2 - 330, 330, 660, 150);
    text('WASD / Arrows — move      Mouse — aim, click to fire embers', VIEW_W / 2, 366, 17, '#ffffff', 'center', 600);
    text('B — build a brazier for 25 embers: its light burns shades', VIEW_W / 2, 396, 17, '#ffffff', 'center', 600);
    text('Shades die in the light. Collect embers to refuel. Survive 10 waves.', VIEW_W / 2, 426, 17, '#ffffff', 'center', 600);
    text('Between waves, draft 1 of 3 relics. Beat the Warden on waves 5 and 10.', VIEW_W / 2, 456, 17, '#ffe66d', 'center', 600);
    if (best > 0) text(`Best score: ${best}`, VIEW_W / 2, 520, 20, '#ffd27a', 'center', 800);
    text('PRESS SPACE OR CLICK TO START', VIEW_W / 2, 580, 22, '#ffffff', 'center', 800);
  }

  function drawChoice(state) {
    ctx.fillStyle = 'rgba(4,6,16,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(`WAVE ${state.wave} CLEARED`, VIEW_W / 2, 150, 40, '#ffd27a', 'center', 900);
    text('Choose a relic — press 1, 2 or 3, or click a card', VIEW_W / 2, 210, 20, '#e8ecff', 'center', 600);
    text(`Score ${state.score}   ·   Kills ${state.kills}   ·   Embers ◆ ${state.embers}`, VIEW_W / 2, 250, 17, '#b9c4f5', 'center', 600);
    const rects = choiceCardRects();
    state.relicChoices.forEach((relic, i) => {
      const r = rects[i];
      panel(r.x, r.y, r.w, r.h);
      text(`${i + 1}`, r.x + r.w / 2, r.y + 34, 16, '#9fb0ff', 'center', 800);
      text(relic.name, r.x + r.w / 2, r.y + 72, 22, '#ffd27a', 'center', 800);
      const words = relic.desc.split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).trim().length > 26) { lines.push(line.trim()); line = w; }
        else line += ' ' + w;
      }
      lines.push(line.trim());
      lines.forEach((ln, li) => text(ln, r.x + r.w / 2, r.y + 116 + li * 24, 15, '#e8ecff', 'center', 500));
      const owned = state.relicsOwned[relic.id] || 0;
      text(owned > 0 ? `Owned ×${owned}` : 'New relic', r.x + r.w / 2, r.y + r.h - 24, 14, '#9fb0ff', 'center', 700);
    });
  }

  function drawEnd(state, best, victory) {
    ctx.fillStyle = 'rgba(4,6,16,0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(VIEW_W / 2 - 320, 150, 640, 380);
    text(victory ? 'THE LIGHT HOLDS' : 'THE DARK TAKES YOU', VIEW_W / 2, 210, 40, victory ? '#ffd27a' : '#ff8fa3', 'center', 900);
    text(victory ? 'You survived all 10 waves. The Warden is ash.' : `You fell on wave ${state.wave}. The lantern gutters out — for now.`, VIEW_W / 2, 262, 18, '#e8ecff', 'center', 600);
    text(`SCORE  ${state.score}`, VIEW_W / 2, 330, 26, '#ffffff', 'center', 800);
    text(`BEST  ${Math.max(best, state.score)}`, VIEW_W / 2, 368, 20, '#ffd27a', 'center', 800);
    text(`Waves cleared ${victory ? 10 : Math.max(0, state.wave - 1)}  ·  Shades burned ${state.kills}  ·  Relics ${Object.values(state.relicsOwned).reduce((a, b) => a + b, 0)}`, VIEW_W / 2, 412, 17, '#b9c4f5', 'center', 600);
    text('PRESS R OR CLICK TO PLAY AGAIN', VIEW_W / 2, 480, 20, '#ffffff', 'center', 800);
  }

  function draw(state, view) {
    const { screen, best, placeMode, mouse } = view;
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    drawBackground(state);
    const lightR = view.lightRadius;
    const brazierR = view.brazierRadius;
    drawBraziers(state, lightR, brazierR);
    drawPickups(state);
    drawEnemies(state);
    drawPlayer(state, lightR);
    drawBolts(state);
    drawParticles(state);
    ctx.restore();
    if (screen === SCREEN_TITLE) { drawTitle(state, best); return; }
    drawHud(state, best, placeMode, screen);
    if (placeMode && mouse) {
      ctx.strokeStyle = 'rgba(255,210,122,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, brazierR, 0, Math.PI * 2); ctx.stroke();
      text(state.embers >= 25 ? 'Click to build a brazier (25◆)' : 'Need 25 embers to build', mouse.x, mouse.y - brazierR - 14, 14, '#ffd27a', 'center', 700);
    }
    if (screen === SCREEN_CHOICE) drawChoice(state);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(4,6,16,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text('PAUSED', VIEW_W / 2, 330, 48, '#ffffff', 'center', 900);
      text('Press P or Space to keep the light burning', VIEW_W / 2, 390, 18, '#b9c4f5', 'center', 600);
    }
    if (screen === SCREEN_OVER) drawEnd(state, best, false);
    if (screen === SCREEN_VICTORY) drawEnd(state, best, true);
  }

  return { draw };
}
