/** Retours sensoriels (vibration + sons synthétisés, sans fichiers audio) */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.12, delay = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export type FxKind = 'tap' | 'set' | 'tick' | 'go' | 'rest_end' | 'victory' | 'levelup';

export function playFx(kind: FxKind, opts: { sound: boolean; haptics: boolean }) {
  if (opts.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const pattern: Record<FxKind, number | number[]> = {
      tap: 10,
      set: [20, 40, 20],
      tick: 8,
      go: [60, 40, 120],
      rest_end: [100, 60, 100, 60, 200],
      victory: [80, 50, 80, 50, 300],
      levelup: [50, 30, 50, 30, 50, 30, 400],
    };
    try {
      navigator.vibrate(pattern[kind]);
    } catch {
      // ignore
    }
  }
  if (!opts.sound) return;
  switch (kind) {
    case 'tap':
      tone(660, 0.05, 'triangle', 0.05);
      break;
    case 'tick':
      tone(880, 0.08, 'square', 0.04);
      break;
    case 'set':
      tone(520, 0.08, 'triangle', 0.1);
      tone(780, 0.14, 'triangle', 0.1, 0.07);
      break;
    case 'go':
      tone(110, 0.5, 'sawtooth', 0.12);
      tone(220, 0.4, 'square', 0.06, 0.02);
      break;
    case 'rest_end':
      tone(740, 0.12, 'square', 0.08);
      tone(740, 0.12, 'square', 0.08, 0.18);
      tone(988, 0.3, 'square', 0.08, 0.36);
      break;
    case 'victory':
    case 'levelup':
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.1));
      tone(98, 0.9, 'sawtooth', 0.08);
      break;
  }
}
