// Web Audio synth: engine, sirens, guns, crashes, footsteps, and three generative stations.
// Lagoon FM, Harbor Wire, and Neon After. Dock Static and Palm Hours borrow those voices.

const VOICES = [
  { scale: [0, 4, 7, 11, 12, 16], tempo: 0.5, wave: 'triangle', bass: 0 },
  { scale: [0, 3, 7, 10, 12, 15], tempo: 0.34, wave: 'sawtooth', bass: -5 },
  { scale: [0, 2, 7, 9, 12, 14], tempo: 0.2, wave: 'square', bass: 7 },
];
const VOICE_OF = [0, 1, 2, 1, 0];

function midiFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createAudio() {
  const api = {
    ctx: null, volume: 0.8, musicVol: 0.6, station: 0, next: 0, step: 0,
    shot: 0, cond: 1, stepAcc: 0, nodes: null, noise: null,
  };
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return api;
  try { api.ctx = new Ctx(); } catch (err) { return api; }
  return api;
}

function boot(audio) {
  if (!audio.ctx || audio.nodes) return;
  const ctx = audio.ctx;
  const master = ctx.createGain();
  master.gain.value = audio.volume * 0.42;
  master.connect(ctx.destination);
  const music = ctx.createGain();
  music.gain.value = audio.musicVol * 0.16;
  music.connect(master);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.7;
  sfx.connect(master);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  const engine = ctx.createOscillator();
  engine.type = 'sawtooth';
  engine.frequency.value = 52;
  const engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engine.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(sfx);
  engine.start();
  const siren = ctx.createOscillator();
  siren.type = 'square';
  siren.frequency.value = 620;
  const sirenGain = ctx.createGain();
  sirenGain.gain.value = 0;
  siren.connect(sirenGain);
  sirenGain.connect(sfx);
  siren.start();
  const len = Math.floor(ctx.sampleRate * 0.25);
  const noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let x = 2463534242;
  for (let i = 0; i < len; i++) {
    x = (1664525 * x + 1013904223) >>> 0;
    data[i] = (x / 4294967296) * 2 - 1;
  }
  audio.noise = noise;
  audio.nodes = { master, music, sfx, engine, engineGain, filter, siren, sirenGain };
}

export function unlockAudio(audio) {
  if (!audio.ctx) return;
  boot(audio);
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
}

export function setMix(audio, volume, music) {
  audio.volume = volume;
  audio.musicVol = music;
  if (!audio.nodes) return;
  audio.nodes.master.gain.value = Math.max(0, volume) * 0.42;
  audio.nodes.music.gain.value = Math.max(0, music) * 0.16;
}

function burst(audio, freq, dur, gain, noiseAmt) {
  const ctx = audio.ctx;
  const now = ctx.currentTime;
  if (freq > 0) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(audio.nodes.sfx);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }
  if (noiseAmt > 0 && audio.noise) {
    const src = ctx.createBufferSource();
    src.buffer = audio.noise;
    const g = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = Math.max(120, freq || 800);
    g.gain.setValueAtTime(noiseAmt, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(audio.nodes.sfx);
    src.start(now);
    src.stop(now + dur);
  }
}

function playNote(audio) {
  const voice = VOICES[VOICE_OF[audio.station] || 0];
  const degree = voice.scale[audio.step % voice.scale.length];
  const midi = 62 + degree + voice.bass + (audio.step % 8 === 0 ? -12 : 0);
  const ctx = audio.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = voice.wave;
  osc.frequency.value = midiFreq(midi);
  g.gain.setValueAtTime(0.22, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + voice.tempo * 0.92);
  osc.connect(g);
  g.connect(audio.nodes.music);
  osc.start(now);
  osc.stop(now + voice.tempo);
  audio.step += 1;
  audio.next = (audio.clock || 0) + voice.tempo;
}

export function updateAudio(audio, dt, state) {
  if (!audio.ctx) return;
  boot(audio);
  if (!audio.nodes) return;
  audio.clock = (audio.clock || 0) + dt;
  audio.station = state.station | 0;
  const nodes = audio.nodes;
  const speed = Math.abs(state.speed || 0);
  nodes.engineGain.gain.value = state.driving ? 0.07 + Math.min(0.2, speed * 0.007) : 0;
  nodes.engine.frequency.value = 46 + speed * 3.4 + (state.throttle || 0) * 22;
  nodes.filter.frequency.value = 240 + speed * 26;
  const siren = state.siren ? 0.045 : 0;
  nodes.sirenGain.gain.value = siren;
  nodes.siren.frequency.value = 540 + Math.sin(audio.clock * 8.5) * 210;
  nodes.music.gain.value = (state.siren ? 0.05 : 0.16) * audio.musicVol * (state.music ? 1 : 0.35);
  if (state.walking) {
    audio.stepAcc += dt * (state.running ? 3.3 : 2.05);
    if (audio.stepAcc >= 1) {
      audio.stepAcc = 0;
      burst(audio, 110, 0.05, 0.04, 0.12);
    }
  } else audio.stepAcc = 0;
  if (state.shot > audio.shot) {
    burst(audio, 160, 0.09, 0.2, 0.55);
    audio.shot = state.shot;
  }
  if (state.condition < audio.cond - 0.01) burst(audio, 70, 0.22, 0.28, 0.6);
  audio.cond = state.condition == null ? audio.cond : state.condition;
  if (state.music !== false && audio.clock >= audio.next) playNote(audio);
}
