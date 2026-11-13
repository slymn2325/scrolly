let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {
      // Ignore autoplay resume errors prior to user gesture
    });
  }
  return sharedAudioCtx;
}

function playTone(
  startFreq: number,
  endFreq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  peakGain = 0.08,
  delaySec = 0
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + Math.min(0.015, durationSec * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  } catch {
    // Graceful no-op if audio fails
  }
}

export function playPop(enabled: boolean): void {
  if (!enabled) return;
  playTone(420, 680, 0.075, 'sine', 0.07);
}

export function playWhoosh(enabled: boolean): void {
  if (!enabled) return;
  // Airy 3D card flip whoosh
  playTone(260, 520, 0.08, 'sine', 0.055, 0);
  playTone(520, 310, 0.09, 'triangle', 0.045, 0.05);
}

export function playFlip(enabled: boolean): void {
  playWhoosh(enabled);
}

export function playSwipe(enabled: boolean): void {
  if (!enabled) return;
  playTone(280, 460, 0.1, 'sine', 0.055);
}

export function playDing(enabled: boolean): void {
  if (!enabled) return;
  playTone(659.25, 659.25, 0.11, 'sine', 0.08, 0);
  playTone(880, 880, 0.22, 'triangle', 0.085, 0.08);
}

export function playPopDing(enabled: boolean): void {
  if (!enabled) return;
  // Double-tap heart burst "pop-ding"
  playTone(480, 720, 0.06, 'sine', 0.075, 0);
  playTone(987.77, 987.77, 0.2, 'triangle', 0.085, 0.055);
}

export function playWhooshDing(enabled: boolean): void {
  if (!enabled) return;
  playTone(240, 580, 0.15, 'sine', 0.06, 0);
  playTone(880, 920, 0.22, 'triangle', 0.075, 0.11);
}

export function playTick(enabled: boolean, urgent = false): void {
  if (!enabled) return;
  const freq = urgent ? 1050 : 800;
  playTone(freq, freq * 0.85, 0.045, 'square', urgent ? 0.045 : 0.025, 0);
}

export function playWrong(enabled: boolean): void {
  if (!enabled) return;
  playTone(220, 160, 0.19, 'triangle', 0.07);
}

export function playCelebration(enabled: boolean): void {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    playTone(freq, freq * 1.01, 0.2, 'triangle', 0.075, idx * 0.085);
  });
}

export function playLeagueCelebration(enabled: boolean): void {
  if (!enabled) return;
  // 5-note triumphant fanfare for League rank-up & 1v1 Duel victory
  const notes = [523.25, 659.25, 783.99, 987.77, 1318.51];
  notes.forEach((freq, idx) => {
    playTone(freq, freq * 1.01, 0.22, 'triangle', 0.08, idx * 0.075);
  });
}
