export function tap(): void {
  navigator.vibrate?.(15);
}

export function timerDone(sound: boolean): void {
  navigator.vibrate?.([180, 90, 180]);
  if (sound) beep();
}

function beep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // Audio not available (no user gesture yet, etc.) — vibration covers it.
  }
}
