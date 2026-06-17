let audioContext = null;
let lastPlayedAt = 0;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  return audioContext;
};

const playBellTone = (context, startTime, frequency, duration, peakGain) => {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, startTime);
  filter.Q.setValueAtTime(0.7, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.04);
};

export const unlockNotificationSound = async () => {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === "suspended") {
    await context.resume();
  }

  return true;
};

export const playNotificationSound = async () => {
  try {
    const nowMs = Date.now();
    if (nowMs - lastPlayedAt < 900) return;

    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      await context.resume();
    }

    lastPlayedAt = nowMs;

    const now = context.currentTime + 0.02;
    playBellTone(context, now, 659.25, 0.34, 0.045);
    playBellTone(context, now + 0.15, 987.77, 0.42, 0.035);
  } catch {
    // Browsers can block audio before the first user interaction.
  }
};
