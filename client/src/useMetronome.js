import { useRef, useCallback } from "react";

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export default function useMetronome() {
  const enabled = useRef(false);

  const tick = useCallback((data) => {
    if (!enabled.current) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const isDownbeat = data.beat === 0;
    osc.frequency.value = isDownbeat ? 1000 : 700;
    osc.type = "sine";

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(isDownbeat ? 0.6 : 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.start(now);
    osc.stop(now + 0.06);
  }, []);

  const setEnabled = useCallback((v) => {
    enabled.current = v;
    if (v) getAudioCtx();
  }, []);

  return { tick, setEnabled };
}
