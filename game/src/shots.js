// Deterministic screenshot scenes. ?shot=start|play|choice|victory with
// &seed=1 stages a fixed scene, paints it twice and sets window.__shotReady
// — the same trick the house games use, so every screenshot is a real render
// of this game's own code, never edited or composited.
import { ENEMY_TYPES } from './config.js';
import { SCREEN_CHOICE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

function placeEnemy(world, kind, x, y) {
  const type = ENEMY_TYPES[kind];
  const enemy = { kind, x, y, hp: type.hp, maxHp: type.hp, speed: type.speed, radius: type.radius, burn: 0, slow: 0, hitCd: 0, spawnTimer: 4 };
  world.state.enemies.push(enemy);
  return enemy;
}

export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  s.braziers = [];
  s.enemies = [];
  s.bolts = [];
  s.pickups = [];
  s.particles = [];
  s.floats = [];
  const best = 4860;

  if (name === 'start') {
    s.player.x = 640; s.player.y = 625;
    s.braziers = [{ x: 320, y: 610, flicker: 1 }, { x: 960, y: 610, flicker: 4 }];
    placeEnemy(world, 'wisp', 300, 220);
    placeEnemy(world, 'shade', 980, 240);
    placeEnemy(world, 'wisp', 760, 180);
    s.banner = '';
    s.bannerTimer = 0;
    return { screen: SCREEN_TITLE, best: 1240 };
  }

  if (name === 'play') {
    s.wave = 4;
    s.score = 1240;
    s.kills = 31;
    s.hp = 82;
    s.fuel = 64;
    s.embers = 38;
    s.player.x = 640; s.player.y = 400;
    s.braziers = [
      { x: 360, y: 300, flicker: 1 }, { x: 920, y: 300, flicker: 4 },
      { x: 360, y: 560, flicker: 7 }, { x: 920, y: 560, flicker: 2 },
    ];
    placeEnemy(world, 'shade', 480, 260);
    placeEnemy(world, 'wisp', 700, 210);
    placeEnemy(world, 'wisp', 820, 300);
    placeEnemy(world, 'brute', 560, 520);
    placeEnemy(world, 'shade', 880, 540);
    placeEnemy(world, 'wisp', 1020, 420);
    placeEnemy(world, 'shade', 240, 420);
    s.bolts = [
      { x: 700, y: 360, vx: 500, vy: -180, life: 0.8 },
      { x: 720, y: 380, vx: 520, vy: -80, life: 0.8 },
      { x: 680, y: 340, vx: 480, vy: -260, life: 0.8 },
    ];
    s.pickups = [{ x: 600, y: 300, vx: 0, vy: 0, kind: 'ember' }, { x: 760, y: 470, vx: 0, vy: 0, kind: 'ember' }, { x: 520, y: 460, vx: 0, vy: 0, kind: 'ember' }];
    s.banner = 'Wave 4 of 10';
    s.bannerTimer = 2;
    return { screen: SCREEN_PLAY, best };
  }

  if (name === 'choice') {
    s.wave = 4;
    s.score = 2180;
    s.kills = 52;
    s.hp = 76;
    s.fuel = 58;
    s.embers = 41;
    s.player.x = 640; s.player.y = 420;
    s.braziers = [{ x: 380, y: 300, flicker: 1 }, { x: 900, y: 300, flicker: 4 }];
    placeEnemy(world, 'wisp', 300, 200);
    s.relicChoices = [
      { id: 'wide', name: 'Wide Flame', desc: '+30 light radius. Your light reaches further, and shades burn sooner.' },
      { id: 'twin', name: 'Twin Shot', desc: '+1 ember bolt per shot. Two flames are better than one.' },
      { id: 'magnet', name: 'Ember Magnet', desc: 'Embers fly to you from twice as far. Fuel finds the keeper.' },
    ];
    s.phase = 'choice';
    s.banner = '';
    s.bannerTimer = 0;
    return { screen: SCREEN_CHOICE, best };
  }

  // victory (also the default for any unknown shot name)
  s.wave = 10;
  s.phase = 'won';
  s.score = 4860;
  s.kills = 87;
  s.hp = 64;
  s.fuel = 41;
  s.embers = 52;
  s.relicsOwned = { wide: 1, twin: 1, magnet: 1, swift: 1 };
  s.player.x = 640; s.player.y = 400;
  s.braziers = [
    { x: 360, y: 300, flicker: 1 }, { x: 920, y: 300, flicker: 4 },
    { x: 360, y: 560, flicker: 7 }, { x: 920, y: 560, flicker: 2 },
  ];
  s.particles = [];
  s.banner = '';
  s.bannerTimer = 0;
  return { screen: SCREEN_VICTORY, best };
}
