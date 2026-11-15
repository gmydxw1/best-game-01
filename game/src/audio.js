// All sound is synthesized with WebAudio: no audio files, no network, and
// nothing to load. The context is created on the first user gesture, as
// browsers require, and every effect is a short oscillator or noise burst.
export function createAudio() {
  let ctx = null;
  let master = null;
  let drone = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  return {
    ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    shoot() { tone(720, 0.09, 'square', 0.08, 340); },
    kill() { tone(520, 0.12, 'sine', 0.14, 940); noise(0.08, 0.06, 2400); },
    hit() { tone(160, 0.18, 'sawtooth', 0.18, 70); noise(0.15, 0.12, 500); },
    pickup() { tone(880, 0.07, 'sine', 0.09, 1320); },
    build() { tone(220, 0.16, 'triangle', 0.16, 440); tone(330, 0.2, 'triangle', 0.1, 660); },
    waveHorn() { tone(196, 0.5, 'sawtooth', 0.12, 196); tone(294, 0.5, 'sawtooth', 0.08, 294); },
    relic() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.12), i * 70)); },
    victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.14), i * 110)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.1), i * 140)); },
    startDrone() {
      if (!ensure() || drone) return;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      osc2.type = 'sine';
      osc2.frequency.value = 55.7;
      gain.gain.value = 0.035;
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(master);
      osc.start();
      osc2.start();
      drone = { osc, osc2, gain };
    },
  };
}
