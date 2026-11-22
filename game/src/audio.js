// VELVET HOUR — synthesized sound. No audio files: every sound is built with
// the Web Audio API at run time, so the game loads nothing over the network.
// Sound is a mechanic here (running is loud, decoys ring), so the synth is quiet
// by design: soft footsteps, a low alarm swell, a bright pickup chime.
let ctx = null;
let master = null;
let muted = false;
let droneNodes = null;

function ensureContext() {
  if (ctx !== null) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}
export function isMuted() {
  return muted;
}

function tone(freq, dur, type = 'sine', vol = 0.16, when = 0, slideTo = null) {
  const c = ensureContext();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, filterFreq) {
  const c = ensureContext();
  if (!c || muted) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
}

export const sfx = {
  footstep() {
    noiseBurst(0.07, 0.05, 320);
  },
  coin() {
    tone(880, 0.1, 'sine', 0.1);
    tone(1318, 0.16, 'sine', 0.09, 0.07);
  },
  pickup() {
    tone(660, 0.12, 'triangle', 0.14);
    tone(990, 0.2, 'triangle', 0.12, 0.08);
  },
  mainLoot() {
    tone(523, 0.14, 'triangle', 0.14);
    tone(659, 0.14, 'triangle', 0.14, 0.1);
    tone(784, 0.24, 'triangle', 0.14, 0.2);
  },
  decoy() {
    tone(1567, 0.08, 'sine', 0.12);
    tone(1567, 0.08, 'sine', 0.08, 0.14);
  },
  smoke() {
    noiseBurst(0.35, 0.12, 900);
  },
  door() {
    tone(180, 0.12, 'square', 0.06);
    tone(120, 0.18, 'square', 0.06, 0.1);
  },
  alarmTick() {
    tone(1150, 0.09, 'sine', 0.07);
  },
  caught() {
    tone(392, 0.3, 'sawtooth', 0.1, 0, 110);
    tone(311, 0.4, 'sawtooth', 0.08, 0.15, 90);
  },
  getaway() {
    tone(523, 0.12, 'triangle', 0.13);
    tone(659, 0.12, 'triangle', 0.13, 0.1);
    tone(784, 0.12, 'triangle', 0.13, 0.2);
    tone(1046, 0.3, 'triangle', 0.13, 0.3);
  },
  click() {
    tone(700, 0.06, 'sine', 0.08);
  },
};

// A low night drone under the game: two detuned sines, barely audible, that
// deepen while the alarm rises. Started on the first user gesture.
export function startDrone() {
  const c = ensureContext();
  if (!c || droneNodes) return;
  try {
    const gain = c.createGain();
    gain.gain.value = 0.035;
    gain.connect(master);
    const o1 = c.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 55.7;
    o1.connect(gain);
    o2.connect(gain);
    o1.start();
    o2.start();
    droneNodes = { gain, o1, o2 };
  } catch (e) {
    droneNodes = null;
  }
}

export function setDroneTension(alarm01) {
  if (!droneNodes || !ctx) return;
  const target = 0.035 + alarm01 * 0.05;
  droneNodes.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
  droneNodes.o1.frequency.setTargetAtTime(55 + alarm01 * 8, ctx.currentTime, 0.4);
}
