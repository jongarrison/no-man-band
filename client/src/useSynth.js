import { useRef, useCallback } from "react";

let audioCtx = null;
let masterGain = null;
let compressor = null;
let delayNode = null;
let delayFeedback = null;
let delayDry = null;
let delayWet = null;
let reverbConvolver = null;
let reverbDry = null;
let reverbWet = null;
let reverbToneFilter = null;
let drySplit = null;

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

    drySplit = audioCtx.createGain();
    drySplit.gain.value = 1;

    delayNode = audioCtx.createDelay(2.0);
    delayNode.delayTime.value = 0.3;
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = 0.25;
    delayDry = audioCtx.createGain();
    delayDry.gain.value = 1;
    delayWet = audioCtx.createGain();
    delayWet.gain.value = 0;

    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWet);

    reverbConvolver = audioCtx.createConvolver();
    reverbConvolver.buffer = buildImpulseResponse(audioCtx, 2.0, 3.0);
    reverbToneFilter = audioCtx.createBiquadFilter();
    reverbToneFilter.type = "lowpass";
    reverbToneFilter.frequency.value = 5000;
    reverbDry = audioCtx.createGain();
    reverbDry.gain.value = 1;
    reverbWet = audioCtx.createGain();
    reverbWet.gain.value = 0;

    reverbConvolver.connect(reverbToneFilter);
    reverbToneFilter.connect(reverbWet);

    // Signal chain: compressor → drySplit
    //   drySplit → delayNode (send) + delayDry (pass-through)
    //   delayDry + delayWet → reverbDry (pass-through) + reverbConvolver (send)
    //   reverbDry + reverbWet → masterGain → destination
    compressor.connect(drySplit);
    drySplit.connect(delayNode);
    drySplit.connect(delayDry);

    delayDry.connect(reverbConvolver);
    delayDry.connect(reverbDry);
    delayWet.connect(reverbConvolver);
    delayWet.connect(reverbDry);

    reverbDry.connect(masterGain);
    reverbWet.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function buildImpulseResponse(ctx, duration, decay) {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function getOutput() {
  getAudioCtx();
  return compressor;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pctToTime(pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  return 0.002 + t * t * 1.998;
}

export default function useSynth() {
  const activeOscs = useRef(new Map());

  const applyFx = useCallback(
    ({
      delayOn = false,
      delayTime = 30,
      delayFb = 25,
      delayMix = 30,
      reverbOn = false,
      reverbSize = 50,
      reverbTone = 70,
      reverbMix = 25,
    }) => {
      getAudioCtx();
      const dMix = delayOn ? Math.max(0, Math.min(100, delayMix)) / 100 : 0;
      delayWet.gain.value = dMix;
      delayDry.gain.value = 1;
      if (delayOn) {
        delayNode.delayTime.value =
          0.05 + (Math.max(0, Math.min(100, delayTime)) / 100) * 0.95;
        delayFeedback.gain.value =
          (Math.max(0, Math.min(100, delayFb)) / 100) * 0.85;
      }

      const rMix = reverbOn ? Math.max(0, Math.min(100, reverbMix)) / 100 : 0;
      reverbWet.gain.value = rMix;
      reverbDry.gain.value = 1;
      if (reverbOn) {
        const size = Math.max(0, Math.min(100, reverbSize)) / 100;
        const newDur = 0.5 + size * 4.5;
        const newDecay = 1 + (1 - size) * 4;
        const ctx = getAudioCtx();
        reverbConvolver.buffer = buildImpulseResponse(ctx, newDur, newDecay);
        const tone = Math.max(0, Math.min(100, reverbTone)) / 100;
        reverbToneFilter.frequency.value = 500 + tone * 9500;
      }
    },
    [],
  );

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
      fxParams = {},
    ) => {
      const ctx = getAudioCtx();
      const output = getOutput();
      const freq = midiToFreq(midi);
      const vol = Math.min(0.3, (velocity / 127) * 0.25);

      applyFx(fxParams);

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
    [applyFx],
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
