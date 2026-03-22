import { useRef, useCallback } from "react";

let audioCtx = null;
let masterGain = null;
let compressor = null;

function getAudioCtx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (!compressor) {
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.1;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;

    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function getOutput() {
  getAudioCtx();
  return compressor;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Attack/Decay/Release: 0–100 → 0.002s–2s (exponential curve for musical feel)
function pctToTime(pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  return 0.002 + t * t * 1.998;
}

export default function useSynth() {
  const activeOscs = useRef(new Map());

  const playNote = useCallback(
    (
      midi,
      velocity = 100,
      durationMs = 200,
      lpf = 100,
      res = 0,
      attack = 1,
      decay = 10,
      sustain = 80,
      release = 15,
    ) => {
      const ctx = getAudioCtx();
      const output = getOutput();
      const freq = midiToFreq(midi);
      const vol = Math.min(0.3, (velocity / 127) * 0.25);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = "triangle";
      osc1.frequency.value = freq;
      osc2.type = "sine";
      osc2.frequency.value = freq;

      const pct = Math.max(0, Math.min(100, lpf)) / 100;
      const minCutoff = freq * 1.2;
      const maxCutoff = Math.min(12000, freq * 8);
      filter.type = "lowpass";
      filter.frequency.value = minCutoff + pct * (maxCutoff - minCutoff);
      const resPct = Math.max(0, Math.min(100, res)) / 100;
      filter.Q.value = 0.5 + resPct * 15;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      const aTime = pctToTime(attack);
      const dTime = pctToTime(decay);
      const sLevel = Math.max(0.001, (sustain / 100) * vol);
      const rTime = pctToTime(release);

      const now = ctx.currentTime;
      const dur = durationMs / 1000;
      const noteOff = now + dur;
      const end = noteOff + rTime;

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + Math.min(aTime, dur * 0.4));
      const decayStart = now + Math.min(aTime, dur * 0.4);
      const decayEnd = decayStart + Math.min(dTime, dur * 0.5);
      gain.gain.linearRampToValueAtTime(sLevel, decayEnd);
      gain.gain.setValueAtTime(sLevel, noteOff);
      gain.gain.exponentialRampToValueAtTime(0.001, end);

      osc1.start(now);
      osc1.stop(end);
      osc2.start(now);
      osc2.stop(end);

      const cleanup = () => {
        gain.disconnect();
        filter.disconnect();
        osc1.disconnect();
        osc2.disconnect();
        activeOscs.current.delete(midi);
      };
      osc1.onended = cleanup;

      if (activeOscs.current.has(midi)) {
        const prev = activeOscs.current.get(midi);
        try {
          prev();
        } catch {}
      }
      activeOscs.current.set(midi, cleanup);
    },
    [],
  );

  const stopAll = useCallback(() => {
    for (const cleanup of activeOscs.current.values()) {
      try {
        cleanup();
      } catch {}
    }
    activeOscs.current.clear();
  }, []);

  return { playNote, stopAll };
}
