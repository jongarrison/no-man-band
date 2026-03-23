import { useRef, useCallback } from "react";

export const SYNTH_VOICES = {
  keys: { label: "Keys", osc1: "triangle", osc2: "sine", detune: 0 },
  soft: { label: "Soft", osc1: "sine", osc2: "sine", detune: 4 },
  pad: { label: "Pad", osc1: "triangle", osc2: "triangle", detune: 8 },
  lead: { label: "Lead", osc1: "square", osc2: "sawtooth", detune: 5 },
  bass: { label: "Bass", osc1: "sawtooth", osc2: "sine", detune: 0 },
  brass: { label: "Brass", osc1: "sawtooth", osc2: "sawtooth", detune: 12 },
  bell: { label: "Bell", osc1: "sine", osc2: "sine", detune: 0 },
  pluck: { label: "Pluck", osc1: "triangle", osc2: "square", detune: 3 },
};

export const VOICE_DEFAULTS = {
  keys: {
    synthLpf: 100,
    synthRes: 0,
    synthAttack: 1,
    synthDecay: 10,
    synthSustain: 80,
    synthRelease: 15,
  },
  soft: {
    synthLpf: 50,
    synthRes: 5,
    synthAttack: 15,
    synthDecay: 30,
    synthSustain: 70,
    synthRelease: 30,
  },
  pad: {
    synthLpf: 65,
    synthRes: 20,
    synthAttack: 40,
    synthDecay: 30,
    synthSustain: 70,
    synthRelease: 50,
  },
  lead: {
    synthLpf: 80,
    synthRes: 30,
    synthAttack: 1,
    synthDecay: 15,
    synthSustain: 60,
    synthRelease: 10,
  },
  bass: {
    synthLpf: 35,
    synthRes: 25,
    synthAttack: 1,
    synthDecay: 20,
    synthSustain: 50,
    synthRelease: 8,
  },
  brass: {
    synthLpf: 70,
    synthRes: 15,
    synthAttack: 8,
    synthDecay: 25,
    synthSustain: 65,
    synthRelease: 20,
  },
  bell: {
    synthLpf: 90,
    synthRes: 10,
    synthAttack: 1,
    synthDecay: 40,
    synthSustain: 10,
    synthRelease: 40,
  },
  pluck: {
    synthLpf: 75,
    synthRes: 15,
    synthAttack: 1,
    synthDecay: 20,
    synthSustain: 5,
    synthRelease: 10,
  },
};

let audioCtx = null;
let masterGain = null;
let limiter = null;
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
let cachedIR = { dur: 2.0, decay: 3.0, buffer: null };

function getAudioCtx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (!compressor) {
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.15;

    limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 1;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;

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

    cachedIR.buffer = buildImpulseResponse(
      audioCtx,
      cachedIR.dur,
      cachedIR.decay,
    );
    reverbConvolver = audioCtx.createConvolver();
    reverbConvolver.buffer = cachedIR.buffer;
    reverbToneFilter = audioCtx.createBiquadFilter();
    reverbToneFilter.type = "lowpass";
    reverbToneFilter.frequency.value = 5000;
    reverbDry = audioCtx.createGain();
    reverbDry.gain.value = 1;
    reverbWet = audioCtx.createGain();
    reverbWet.gain.value = 0;

    reverbConvolver.connect(reverbToneFilter);
    reverbToneFilter.connect(reverbWet);

    compressor.connect(drySplit);
    drySplit.connect(delayNode);
    drySplit.connect(delayDry);

    delayDry.connect(reverbConvolver);
    delayDry.connect(reverbDry);
    delayWet.connect(reverbConvolver);
    delayWet.connect(reverbDry);

    reverbDry.connect(masterGain);
    reverbWet.connect(masterGain);
    masterGain.connect(limiter);
    limiter.connect(audioCtx.destination);
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

const FADE_OUT_TIME = 0.015;

export default function useSynth() {
  const activeNotes = useRef(new Map());

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
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      const dMix = delayOn ? Math.max(0, Math.min(100, delayMix)) / 100 : 0;
      delayWet.gain.setTargetAtTime(dMix, now, 0.02);
      if (delayOn) {
        delayNode.delayTime.setTargetAtTime(
          0.05 + (Math.max(0, Math.min(100, delayTime)) / 100) * 0.95,
          now,
          0.02,
        );
        delayFeedback.gain.setTargetAtTime(
          (Math.max(0, Math.min(100, delayFb)) / 100) * 0.85,
          now,
          0.02,
        );
      }

      const rMix = reverbOn ? Math.max(0, Math.min(100, reverbMix)) / 100 : 0;
      reverbWet.gain.setTargetAtTime(rMix, now, 0.02);
      if (reverbOn) {
        const size = Math.max(0, Math.min(100, reverbSize)) / 100;
        const newDur = Math.round((0.5 + size * 4.5) * 10) / 10;
        const newDecay = Math.round((1 + (1 - size) * 4) * 10) / 10;
        if (newDur !== cachedIR.dur || newDecay !== cachedIR.decay) {
          cachedIR.dur = newDur;
          cachedIR.decay = newDecay;
          cachedIR.buffer = buildImpulseResponse(ctx, newDur, newDecay);
          reverbConvolver.buffer = cachedIR.buffer;
        }
        reverbToneFilter.frequency.setTargetAtTime(
          500 + (Math.max(0, Math.min(100, reverbTone)) / 100) * 9500,
          now,
          0.02,
        );
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
      voice = "keys",
    ) => {
      const ctx = getAudioCtx();
      const output = getOutput();
      const freq = midiToFreq(midi);
      const trackVol = Math.max(0, Math.min(100, fxParams.volume ?? 80)) / 100;
      const vol = Math.min(0.18, (velocity / 127) * 0.15) * trackVol;

      applyFx(fxParams);

      const v = SYNTH_VOICES[voice] || SYNTH_VOICES.keys;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = v.osc1;
      osc1.frequency.value = freq;
      osc2.type = v.osc2;
      osc2.frequency.value = freq;
      osc2.detune.value = v.detune;

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
      const sLevel = Math.max(0.0001, (sustain / 100) * vol);
      const rTime = pctToTime(release);

      const now = ctx.currentTime;
      const dur = durationMs / 1000;
      const attackEnd = now + Math.min(aTime, dur * 0.4);
      const decayEnd = attackEnd + Math.min(dTime, dur * 0.5);
      const noteOff = now + dur;
      const end = noteOff + rTime + 0.01;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, attackEnd);
      gain.gain.linearRampToValueAtTime(sLevel, decayEnd);
      gain.gain.setValueAtTime(sLevel, noteOff);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteOff + rTime);
      gain.gain.linearRampToValueAtTime(0, end);

      osc1.start(now);
      osc1.stop(end + 0.05);
      osc2.start(now);
      osc2.stop(end + 0.05);

      const hardDisconnect = () => {
        try {
          osc1.stop();
        } catch {}
        try {
          osc2.stop();
        } catch {}
        gain.disconnect();
        filter.disconnect();
        osc1.disconnect();
        osc2.disconnect();
      };

      osc1.onended = () => {
        hardDisconnect();
        activeNotes.current.delete(midi);
      };

      if (activeNotes.current.has(midi)) {
        const prev = activeNotes.current.get(midi);
        prev.fadeOut();
      }

      const fadeOut = () => {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, FADE_OUT_TIME / 4);
        try {
          osc1.stop(t + FADE_OUT_TIME + 0.02);
        } catch {}
        try {
          osc2.stop(t + FADE_OUT_TIME + 0.02);
        } catch {}
      };

      activeNotes.current.set(midi, { fadeOut });
    },
    [applyFx],
  );

  const stopAll = useCallback(() => {
    for (const note of activeNotes.current.values()) {
      note.fadeOut();
    }
    activeNotes.current.clear();
  }, []);

  return { playNote, stopAll };
}
