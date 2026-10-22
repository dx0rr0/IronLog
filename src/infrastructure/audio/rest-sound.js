// Rest-end chime. Mobile browsers only allow audio from a context that was
// created/resumed during a user gesture, so the context is unlocked when the
// rest starts (tapping a set's check) and the chime is scheduled ahead on the
// audio clock. That way it still sounds if the JS timers are throttled.
let ctx = null;
let pending = null; // { endsAt, at, nodes }

const context = () => {
  if (ctx) return ctx;
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  return ctx;
};

export function unlockAudio() {
  try {
    const audio = context();
    if (!audio) return;
    if (audio.state === 'suspended') void audio.resume?.();
    // iOS needs something to actually play inside the gesture.
    if (audio.createBuffer && audio.createBufferSource) {
      const source = audio.createBufferSource();
      source.buffer = audio.createBuffer(1, 1, 22050);
      source.connect(audio.destination);
      source.start(0);
    }
  } catch {}
}

// Boxing-ring bell: three quick metallic strikes (inharmonic partials with
// short exponential tails) that cut through gym music.
const STRIKES = [0, 0.26, 0.52];
const PARTIALS = [[1, 0.45, 0.7], [1.5, 0.2, 0.5], [2.31, 0.14, 0.35], [3.1, 0.08, 0.25]];
const BELL_HZ = 1180;

function chime(audio, at) {
  const nodes = [];
  STRIKES.forEach(offset => PARTIALS.forEach(([ratio, level, decay]) => {
    const start = at + offset;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = BELL_HZ * ratio;
    osc.connect(gain);
    gain.connect(audio.destination);
    gain.gain.setValueAtTime?.(0.0001, start);
    gain.gain.exponentialRampToValueAtTime?.(level, start + 0.004);
    gain.gain.exponentialRampToValueAtTime?.(0.0001, start + decay);
    osc.start(start);
    osc.stop(start + decay + 0.05);
    nodes.push(osc);
  }));
  return nodes;
}

export function cancelRestChime() {
  pending?.nodes.forEach(node => { try { node.stop(0); } catch {} });
  pending = null;
}

export function scheduleRestChime(endsAt) {
  cancelRestChime();
  try {
    const audio = context();
    const delay = (endsAt - Date.now()) / 1000;
    if (!audio || delay <= 0) return;
    const at = audio.currentTime + delay;
    pending = { endsAt, at, nodes: chime(audio, at) };
  } catch {}
}

// Called when the app notices the rest is over. If the scheduled chime has
// already played (audio clock kept running) do nothing; otherwise play now.
export function finishRestChime(endsAt, { late = false } = {}) {
  try {
    const audio = context();
    const played = pending?.endsAt === endsAt && audio && audio.currentTime >= pending.at - 0.05;
    if (played) { pending = null; return; }
    cancelRestChime();
    if (late || !audio) return;
    if (audio.state === 'suspended') void audio.resume?.();
    chime(audio, audio.currentTime + 0.02);
  } catch {}
}
