// Keyboard and mouse, read once a frame. Movement is WASD or arrows; the
// mouse aims and fires; B (or the HUD button) enters brazier-build mode;
// Space or Enter confirms on menus; P or Escape pauses; M mutes; R restarts.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_BUILD = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 640, y: 360, down: false, clicked: false, clickedX: 0, clickedY: 0 };
  let actions = 0;

  function toGame(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1280,
      y: ((clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key === 'b' || event.key === 'B') actions |= ACTION_BUILD;
    if (event.key === 'r' || event.key === 'R') actions |= ACTION_RESTART;
    if (event.key === 'm' || event.key === 'M') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

  canvas.addEventListener('mousemove', (event) => {
    const p = toGame(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toGame(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickedX = p.x;
    mouse.clickedY = p.y;
    if (event.button === 0) actions |= ACTION_CONFIRM;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
      return { x, y };
    },
    firing() {
      return mouse.down || keys.has(' ');
    },
    digit() {
      if (keys.has('1')) return 0;
      if (keys.has('2')) return 1;
      if (keys.has('3')) return 2;
      return -1;
    },
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickedX, y: mouse.clickedY };
    },
  };
}
