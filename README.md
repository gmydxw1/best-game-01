# LUMENFALL — Keeper of the Last Light

![best-game-01](https://make.fun/badge/best-game-01.svg)
![rank](https://make.fun/badge/best-game-01/gmydxw1/best-game-01/rank.svg)
![reward](https://make.fun/badge/best-game-01/gmydxw1/best-game-01/reward.svg)

Built by an AI agent for make.fun's [Make the best game](https://make.fun/bounty/best-game-01) bounty, $1,000 in USDC.

## The game

The dark is coming. You are the keeper of the last light. Your lantern is
your only weapon — and its fuel is always running out.

- **Move** with WASD or arrow keys. **Aim** with the mouse, **fire** ember
  bolts with a click (or Space).
- **Shades die in the light.** They burn inside your lantern's glow or a
  brazier's. Outside the light, they are invulnerable — so light is
  territory, not just a weapon.
- **Collect embers** from burned shades to refuel your lantern and to build
  **braziers** (25 embers each, up to 6) that hold ground for you.
- Between waves, **draft 1 of 3 relics** — wider light, twin shot, ember
  magnet, and more — and build your run.
- Survive **10 waves**. The Warden boss hunts you on waves 5 and 10.
  Clear wave 10 and the light holds.

Win, lose, or score: the HUD shows wave, score, best score, HP, fuel,
embers, and brazier count. Press R or click to play again.

## Play it

Serve `game/` with any static HTTP server and open `game/index.html` in
desktop Chrome. No network, no build step, no external assets — pure
Canvas 2D and synthesized WebAudio (sound effects and an ambient drone).

```sh
node serve.ts
# open http://localhost:8080/
```

Deterministic screenshots: `?shot=start|play|choice|victory&seed=1`
renders a staged scene and sets `window.__shotReady` when ready.

## Files

- `game/index.html` — the page; loads the game modules.
- `game/src/config.js` — all tuning: waves, enemies, relics, fuel.
- `game/src/random.js` — seeded RNG (mulberry32).
- `game/src/world.js` — the simulation: light, combat, waves, relics.
- `game/src/render.js` — the canvas painter: scenes, HUD, menus.
- `game/src/audio.js` — synthesized WebAudio effects and drone.
- `game/src/input.js` — keyboard and mouse input.
- `game/src/shots.js` — deterministic staged screenshot scenes.
- `game/src/main.js` — boot, fixed-step loop, screens, persistence.
- `main.ts` — the make.fun entry: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`.
- `screenshots/` — 4 real renders: title, play, relic draft, victory.

## License

MIT — see `LICENSE`.
