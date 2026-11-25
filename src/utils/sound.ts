let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      audioCtx = new Ctor();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'triangle',
  gainPeak = 0.08,
  delaySec = 0,
): void {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export const somRPG = {
  ataque(habilitado: boolean) {
    if (!habilitado) return;
    playTone(190, 0.09, 'sawtooth', 0.06);
    playTone(110, 0.12, 'triangle', 0.08, 0.05);
  },
  especial(habilitado: boolean) {
    if (!habilitado) return;
    playTone(330, 0.12, 'triangle', 0.07);
    playTone(495, 0.16, 'sine', 0.08, 0.06);
  },
  pocao(habilitado: boolean) {
    if (!habilitado) return;
    playTone(523.25, 0.11, 'sine', 0.06);
    playTone(659.25, 0.14, 'sine', 0.07, 0.07);
  },
  compra(habilitado: boolean) {
    if (!habilitado) return;
    playTone(784, 0.08, 'sine', 0.06);
    playTone(1046.5, 0.12, 'sine', 0.06, 0.06);
  },
  vitoria(habilitado: boolean) {
    if (!habilitado) return;
    playTone(523.25, 0.12, 'triangle', 0.07, 0);
    playTone(659.25, 0.12, 'triangle', 0.07, 0.1);
    playTone(783.99, 0.22, 'triangle', 0.08, 0.2);
  },
  erro(habilitado: boolean) {
    if (!habilitado) return;
    playTone(165, 0.16, 'sawtooth', 0.05);
  },
};
