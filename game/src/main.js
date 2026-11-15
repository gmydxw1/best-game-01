// Boot and the one loop. The world advances in fixed 1/60 s steps and the
// renderer paints what is there. Screens: title, play, paused, choice,
// game over, victory. ?shot=start|play|choice|victory stages a screenshot
// scene instead of running the loop.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_BUILD, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART,
  createInput,
} from './input.js';
import {
  EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_WAVE_CLEAR, EVENT_WON,
  createWorld,
} from './world.js';
import {
  SCREEN_CHOICE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
  SCREEN_VICTORY, choiceCardRects, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode: best lasts this visit */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, {
      screen: scene.screen, best: scene.best, placeMode: false, mouse: null,
      lightRadius: world.lightRadius(), brazierRadius: world.brazierRadius(),
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let placeMode = false;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startGame() {
    audio.ensure();
    audio.startDrone();
    world.reset();
    accumulator = 0;
    placeMode = false;
    screen = SCREEN_PLAY;
    audio.waveHorn();
    announce('Playing. Survive 10 waves. Keep the light alive.');
  }

  function endGame(won) {
    screen = won ? SCREEN_VICTORY : SCREEN_OVER;
    if (world.state.score > best) { best = world.state.score; saveBest(best); }
    if (won) audio.victory();
    else audio.defeat();
    announce(won
      ? `Victory. Score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function stepWorld() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, aimX: 640, aimY: 360, firing: false, buildAt: null }, true);
      return;
    }
    const dir = input.direction();
    const click = input.takeClick();
    let buildAt = null;
    if (placeMode && click && screen === SCREEN_PLAY) {
      buildAt = { x: click.x, y: click.y };
      placeMode = false;
    }
    const events = world.step(STEP, {
      dx: dir.x, dy: dir.y, aimX: input.mouse.x, aimY: input.mouse.y,
      firing: input.firing() && screen === SCREEN_PLAY && !placeMode, buildAt,
    }, false);
    if (events & EVENT_KILL) audio.kill();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.hp <= 25 ? 'Hit. Your light is fading.' : `Hit. ${Math.ceil(world.state.hp)} health left.`);
    }
    if (events & EVENT_WAVE_CLEAR) {
      screen = SCREEN_CHOICE;
      audio.relic();
      announce(`Wave ${world.state.wave} cleared. Choose a relic.`);
    }
    if (events & EVENT_WON) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (actions & ACTION_BUILD && screen === SCREEN_PLAY) {
      placeMode = !placeMode;
      announce(placeMode ? 'Build mode: click the ground to place a brazier.' : 'Build mode off.');
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_VICTORY)) startGame();
    if (screen === SCREEN_CHOICE) {
      const digit = input.digit();
      if (digit >= 0 && world.chooseRelic(digit)) {
        audio.relic();
        screen = SCREEN_PLAY;
        announce(`Relic taken. Wave ${world.state.wave} begins.`);
        return;
      }
      const click = input.takeClick();
      if (click) {
        const rects = choiceCardRects();
        const i = rects.findIndex((r) => click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h);
        if (i >= 0 && world.chooseRelic(i)) {
          audio.relic();
          screen = SCREEN_PLAY;
          announce(`Relic taken. Wave ${world.state.wave} begins.`);
        }
      }
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
        // A click on the title screen starts the game; a click in play is a shot,
        // so only start from a menu screen, and only once per click.
        if (screen === SCREEN_TITLE) startGame();
        else if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) startGame();
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        stepWorld();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, {
      screen, best, placeMode, mouse: input.mouse,
      lightRadius: world.lightRadius(), brazierRadius: world.brazierRadius(),
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Lumenfall. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
