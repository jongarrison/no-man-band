const EventEmitter = require("events");
const noteHelper = require("../lib/noteHelper");
const { createOutput } = require("../lib/midiHelper");

const ALL_NOTES = [
  "C",
  "Cs",
  "D",
  "Ds",
  "E",
  "F",
  "Fs",
  "G",
  "Gs",
  "A",
  "As",
  "B",
];
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  "harm minor": [0, 2, 3, 5, 7, 8, 11],
  "mel minor": [0, 2, 3, 5, 7, 9, 11],
  "maj pent": [0, 2, 4, 7, 9],
  "min pent": [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

function getScaleNotes(key, mode) {
  const root = ALL_NOTES.indexOf(key);
  if (root === -1) return getScaleNotes("C", mode);
  const intervals = SCALES[mode] || SCALES.major;
  return intervals.map((i) => ALL_NOTES[(root + i) % 12]);
}

function transposeInputs(inputs, oldKey, oldMode, newKey, newMode) {
  if (!inputs || !Array.isArray(inputs)) return inputs;
  const oldScale = getScaleNotes(oldKey, oldMode);
  const newScale = getScaleNotes(newKey, newMode);
  return inputs.map((row) => {
    if (!Array.isArray(row)) return row;
    return row.map((note) => {
      if (!note) return note;
      const degree = oldScale.indexOf(note);
      if (degree !== -1 && degree < newScale.length) return newScale[degree];
      const noteIdx = ALL_NOTES.indexOf(note);
      if (noteIdx === -1) return note;
      const rootIdx = ALL_NOTES.indexOf(oldKey);
      const semitones = (noteIdx - rootIdx + 12) % 12;
      const intervals = SCALES[oldMode] || SCALES.major;
      let closest = 0;
      let minDist = 12;
      for (let d = 0; d < intervals.length; d++) {
        const dist = Math.abs(intervals[d] - semitones);
        if (dist < minDist) {
          minDist = dist;
          closest = d;
        }
      }
      return closest < newScale.length ? newScale[closest] : note;
    });
  });
}

function buildChordMidi(key, mode, degree, voicing, octMin, octMax) {
  const root = ALL_NOTES.indexOf(key);
  const intervals = SCALES[mode] || SCALES.major;
  const len = intervals.length;
  const chordIntervals = [];
  for (let i = 0; i < voicing; i++) {
    const idx = (degree + i * 2) % len;
    const octWrap = Math.floor((degree + i * 2) / len);
    chordIntervals.push(intervals[idx] + octWrap * 12);
  }
  const lowerBound = octMin * 12 + 24;
  const upperBound = (octMax + 1) * 12 + 23;
  const notes = [];
  for (let oct = octMin; oct <= octMax; oct++) {
    for (const semi of chordIntervals) {
      const midi = root + semi + oct * 12 + 24;
      if (midi >= lowerBound && midi <= upperBound) {
        notes.push(midi);
      }
    }
  }
  notes.sort((a, b) => a - b);
  const unique = [...new Set(notes)];
  return unique;
}

function buildArpSequence(chordNotes, pattern) {
  if (chordNotes.length === 0) return [];
  switch (pattern) {
    case "down":
      return [...chordNotes].reverse();
    case "updown": {
      if (chordNotes.length <= 1) return chordNotes;
      const up = [...chordNotes];
      const down = [...chordNotes].reverse().slice(1, -1);
      return up.concat(down);
    }
    case "random":
      return chordNotes;
    case "up":
    default:
      return [...chordNotes];
  }
}

function chordLabel(key, mode, degree) {
  const intervals = SCALES[mode] || SCALES.major;
  const len = intervals.length;
  if (degree >= len) return String(degree + 1);

  const root = ALL_NOTES.indexOf(key);
  const chordRoot = ALL_NOTES[(root + intervals[degree]) % 12];
  const noteName =
    chordRoot.length === 2 && chordRoot[1] === "s"
      ? chordRoot[0] + "#"
      : chordRoot;

  const third = intervals[(degree + 2) % len] - intervals[degree];
  const adjustedThird = ((third % 12) + 12) % 12;
  const isMinor = adjustedThird === 3;
  const fifth = intervals[(degree + 4) % len] - intervals[degree];
  const adjustedFifth = ((fifth % 12) + 12) % 12;
  const isDim = adjustedFifth === 6;
  const isAug = adjustedFifth === 8;

  let quality = isMinor ? "m" : "";
  if (isDim) quality = "dim";
  if (isAug) quality = "aug";

  return noteName + quality;
}

const CONF_KEYS = new Set([
  "playImpromptuOn",
  "playScaleOn",
  "playBeatOn",
  "impromptuInputs",
  "impromptuInputsCycle",
  "impromptuOctaves",
  "impromptuOctave",
  "octaveMin",
  "octaveMax",
  "midiChannel",
  "active",
  "timeDivision",
  "key",
  "mode",
  "velocityOn",
  "velocityMin",
  "velocityMax",
  "release",
  "steps",
  "internalAudio",
  "synthVoice",
  "synthVolume",
  "synthLpf",
  "synthRes",
  "synthAttack",
  "synthDecay",
  "synthSustain",
  "synthRelease",
  "synthDelayOn",
  "synthDelayTime",
  "synthDelayFeedback",
  "synthDelayMix",
  "synthReverbOn",
  "synthReverbSize",
  "synthReverbTone",
  "synthReverbMix",
  "arpMode",
  "arpDegree",
  "arpVoicing",
  "arpPattern",
]);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomOctaves(count, octMin, octMax) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(randInt(octMin, octMax));
  }
  return arr;
}

function generateRandomSequence(key, mode, steps, octMin = 3, octMax = 4) {
  const scaleNotes = getScaleNotes(key, mode);
  const pool = [...scaleNotes, ""];
  if (steps) {
    const row = [];
    for (let i = 0; i < steps; i++) {
      row.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return {
      impromptuInputs: [row],
      impromptuInputsCycle: [0],
      impromptuOctaves: generateRandomOctaves(steps, octMin, octMax),
    };
  }
  const numRows = randInt(2, 4);
  const inputs = [];
  for (let r = 0; r < numRows; r++) {
    const len = randInt(3, 6);
    const row = [];
    for (let c = 0; c < len; c++) {
      row.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    inputs.push(row);
  }
  const cycleLen = randInt(3, 6);
  const cycle = [];
  for (let i = 0; i < cycleLen; i++) {
    cycle.push(Math.floor(Math.random() * numRows));
  }
  let totalSteps = 0;
  for (const idx of cycle) {
    if (inputs[idx]) totalSteps += inputs[idx].length;
  }
  return {
    impromptuInputs: inputs,
    impromptuInputsCycle: cycle,
    impromptuOctaves: generateRandomOctaves(totalSteps, octMin, octMax),
  };
}

let nextId = 1;

function createDefaultConf() {
  const key = "C";
  const mode = "major";
  const octaveMin = 3;
  const octaveMax = 4;
  const seq = generateRandomSequence(
    key,
    mode,
    undefined,
    octaveMin,
    octaveMax,
  );
  return {
    playImpromptuOn: true,
    playScaleOn: false,
    playBeatOn: false,
    impromptuInputs: seq.impromptuInputs,
    impromptuInputsCycle: seq.impromptuInputsCycle,
    impromptuOctaves: seq.impromptuOctaves,
    impromptuOctave: 3,
    octaveMin,
    octaveMax,
    midiChannel: 1,
    active: true,
    timeDivision: 4,
    key,
    mode,
    velocityOn: false,
    velocityMin: 60,
    velocityMax: 120,
    release: 80,
    internalAudio: false,
    synthVoice: "keys",
    synthVolume: 80,
    synthLpf: 100,
    synthRes: 0,
    synthAttack: 1,
    synthDecay: 10,
    synthSustain: 80,
    synthRelease: 15,
    synthDelayOn: false,
    synthDelayTime: 30,
    synthDelayFeedback: 25,
    synthDelayMix: 30,
    synthReverbOn: false,
    synthReverbSize: 50,
    synthReverbTone: 70,
    synthReverbMix: 25,
    arpMode: false,
    arpDegree: 0,
    arpVoicing: 3,
    arpPattern: "up",
  };
}

class Track {
  constructor(id) {
    this.id = id;
    this.conf = createDefaultConf();
    this.output = createOutput(`track-${id}`);
    this._cycle = 0;
    this._playing = true;
    this._paused = false;
    this._noteOffTimers = [];
  }

  _getVelocity(genVelocity, genVelocitySpread) {
    if (genVelocity !== undefined && genVelocity) {
      const spread = genVelocitySpread || 50;
      const center = 100;
      const half = Math.round((spread / 100) * 63);
      const min = Math.max(1, center - half);
      const max = Math.min(127, center + half);
      return randInt(min, max);
    }
    if (this.conf.velocityOn) {
      const lo = Math.max(1, Math.min(127, this.conf.velocityMin || 60));
      const hi = Math.max(lo, Math.min(127, this.conf.velocityMax || 120));
      return randInt(lo, hi);
    }
    return 100;
  }

  sendNote(noteNumber, bpm, velocity = 100) {
    if (!this.conf.active) return null;
    const noteOn = 143 + this.conf.midiChannel;
    const noteOff = 127 + this.conf.midiChannel;
    this.output.sendMessage([noteOn, noteNumber, velocity]);

    const beatMs = 1000 / (bpm / 60);
    const gate = Math.max(0.1, Math.min(1, (this.conf.release || 80) / 100));
    const durationMs = beatMs * gate;
    const timer = setTimeout(() => {
      this.output.sendMessage([noteOff, noteNumber, 0]);
      const idx = this._noteOffTimers.indexOf(timer);
      if (idx !== -1) this._noteOffTimers.splice(idx, 1);
    }, durationMs);
    this._noteOffTimers.push(timer);

    return { trackId: this.id, note: noteNumber, velocity, durationMs };
  }

  playCycle(bpm, genVelocity, genVelocitySpread) {
    const cycle = this._cycle;
    this._cycle++;
    const vel = this._getVelocity(genVelocity, genVelocitySpread);
    const events = [];
    if (this.conf.playScaleOn) {
      const e = this._playScale(cycle, bpm, vel);
      if (e) events.push(e);
    }
    if (this.conf.playBeatOn) {
      const e = this._playBeat(cycle, bpm, vel);
      if (e) events.push(e);
    }
    if (this.conf.playImpromptuOn) {
      const e = this._playImpromptu(cycle, bpm, vel);
      if (e) events.push(e);
    }
    return events;
  }

  allNotesOff() {
    const cc = 175 + this.conf.midiChannel;
    this.output.sendMessage([cc, 123, 0]);
  }

  destroy() {
    for (const t of this._noteOffTimers) clearTimeout(t);
    this._noteOffTimers = [];
    this.allNotesOff();
    this.output.disconnect();
  }

  _playScale(cycle, bpm, vel) {
    const scaleNotes = getScaleNotes(this.conf.key, this.conf.mode);
    const idx = cycle % scaleNotes.length;
    const noteName = scaleNotes[idx];
    const oct = randInt(this.conf.octaveMin, this.conf.octaveMax);
    const noteNumber = noteHelper.notes[noteName] + oct * 12;
    return this.sendNote(noteNumber, bpm, vel);
  }

  _playBeat(cycle, bpm, vel) {
    const pos = cycle % 4;
    if (pos === 2) return this.sendNote(24 + 5 * 12, bpm, vel);
    if (pos === 3) return this.sendNote(24 + 6 * 12, bpm, vel);
    return null;
  }

  _playImpromptu(cycle, bpm, vel) {
    if (this.conf.arpMode) {
      return this._playArp(cycle, bpm, vel);
    }
    let result = [];
    for (const idx of this.conf.impromptuInputsCycle) {
      result = result.concat(this.conf.impromptuInputs[idx]);
    }
    if (result.length === 0) return null;
    const pos = cycle % result.length;
    this._seqPos = pos;
    const noteName = result[pos];
    let noteNumber = noteHelper.notes[noteName];
    if (noteNumber !== undefined) {
      const oct =
        this.conf.impromptuOctaves?.[pos] ?? this.conf.impromptuOctave;
      noteNumber = noteNumber + oct * 12;
      const event = this.sendNote(noteNumber, bpm, vel);
      if (event) event.seqPos = pos;
      return event || { trackId: this.id, seqPos: pos, rest: true };
    }
    return { trackId: this.id, seqPos: pos, rest: true };
  }

  _playArp(cycle, bpm, vel) {
    const chordNotes = buildChordMidi(
      this.conf.key,
      this.conf.mode,
      this.conf.arpDegree ?? 0,
      this.conf.arpVoicing ?? 3,
      this.conf.octaveMin,
      this.conf.octaveMax,
    );
    if (chordNotes.length === 0) return null;
    const pattern = this.conf.arpPattern || "up";
    const seq = buildArpSequence(chordNotes, pattern);
    if (seq.length === 0) return null;

    let pos;
    if (pattern === "random") {
      pos = Math.floor(Math.random() * seq.length);
    } else {
      pos = cycle % seq.length;
    }
    this._seqPos = pos;
    const midi = seq[pos];
    const event = this.sendNote(midi, bpm, vel);
    if (event) {
      event.seqPos = pos;
      event.arpLen = seq.length;
    }
    return event || { trackId: this.id, seqPos: pos, rest: true };
  }
}

class TrackManager extends EventEmitter {
  constructor() {
    super();
    this.BPM = 180;
    this.tracks = [];
    this._interval = null;
    this._paused = false;
    this.globalKeyMode = false;
    this.globalKey = "C";
    this.globalMode = "major";
    this.pianoOctStart = 2;
    this.pianoOctEnd = 5;
    this.stepsMin = 4;
    this.stepsMax = 16;
    this.generativeMode = false;
    this.metronome = false;
    this.genVelocity = false;
    this.genVelocitySpread = 50;
    this.genRelease = false;
    this.genReleaseBias = 50;
  }

  addTrack() {
    const track = new Track(nextId++);
    if (this.globalKeyMode) {
      track.conf.key = this.globalKey;
      track.conf.mode = this.globalMode;
      const seq = generateRandomSequence(
        this.globalKey,
        this.globalMode,
        undefined,
        track.conf.octaveMin,
        track.conf.octaveMax,
      );
      track.conf.impromptuInputs = seq.impromptuInputs;
      track.conf.impromptuInputsCycle = seq.impromptuInputsCycle;
      track.conf.impromptuOctaves = seq.impromptuOctaves;
    }
    this.tracks.push(track);
    if (this.generativeMode && this._savedConfs) {
      this._savedConfs.set(track.id, JSON.parse(JSON.stringify(track.conf)));
      track._genRhythm = this._generateRhythm();
    }
    this._emitState();
    return track.id;
  }

  duplicateTrack(id) {
    const source = this.getTrack(id);
    if (!source) return null;
    const track = new Track(nextId++);
    track.conf = JSON.parse(JSON.stringify(source.conf));
    this.tracks.push(track);
    this._emitState();
    return track.id;
  }

  removeTrack(id) {
    const idx = this.tracks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    this.tracks[idx].destroy();
    this.tracks.splice(idx, 1);
    this._emitState();
  }

  getTrack(id) {
    return this.tracks.find((t) => t.id === id);
  }

  setTrackConf(id, patch) {
    const track = this.getTrack(id);
    if (!track || !patch || typeof patch !== "object") return;
    const filtered = {};
    for (const k of Object.keys(patch)) {
      if (CONF_KEYS.has(k)) filtered[k] = patch[k];
    }
    patch = filtered;
    const keyChanging = patch.key !== undefined && patch.key !== track.conf.key;
    const modeChanging =
      patch.mode !== undefined && patch.mode !== track.conf.mode;
    if (keyChanging || modeChanging) {
      const oldKey = track.conf.key;
      const oldMode = track.conf.mode;
      const newKey = patch.key !== undefined ? patch.key : track.conf.key;
      const newMode = patch.mode !== undefined ? patch.mode : track.conf.mode;
      track.conf.impromptuInputs = transposeInputs(
        track.conf.impromptuInputs,
        oldKey,
        oldMode,
        newKey,
        newMode,
      );
    }
    if (patch.midiChannel !== undefined) {
      patch.midiChannel = Math.max(
        1,
        Math.min(16, Number(patch.midiChannel) || 1),
      );
    }
    if (patch.release !== undefined) {
      patch.release = Math.max(10, Math.min(100, Number(patch.release) || 80));
    }
    if (patch.timeDivision !== undefined) {
      patch.timeDivision = Math.max(
        1,
        Math.min(4, Number(patch.timeDivision) || 4),
      );
    }
    if (patch.internalAudio === true && track.output.isConnected()) {
      track.output.disconnect();
    }
    Object.assign(track.conf, patch);
    const octRangeChanged =
      patch.octaveMin !== undefined || patch.octaveMax !== undefined;
    if (octRangeChanged) {
      track.conf.octaveMin = Math.max(this.pianoOctStart, track.conf.octaveMin);
      track.conf.octaveMax = Math.min(this.pianoOctEnd, track.conf.octaveMax);
      if (track.conf.octaveMin > track.conf.octaveMax) {
        track.conf.octaveMax = track.conf.octaveMin;
      }
    }
    if (octRangeChanged && track.conf.impromptuOctaves) {
      const lo = track.conf.octaveMin;
      const hi = track.conf.octaveMax;
      track.conf.impromptuOctaves = generateRandomOctaves(
        track.conf.impromptuOctaves.length,
        lo,
        hi,
      );
    }
    this._emitState();
  }

  _randomizeOctRange() {
    const gMin = this.pianoOctStart;
    const gMax = this.pianoOctEnd;
    const lo = randInt(gMin, gMax);
    const hi = randInt(lo, gMax);
    return [lo, hi];
  }

  randomizeTrack(id) {
    const track = this.getTrack(id);
    if (!track) return;
    const c = track.conf;
    const [lo, hi] = this._randomizeOctRange();
    c.octaveMin = lo;
    c.octaveMax = hi;
    c.steps = randInt(this.stepsMin, this.stepsMax);
    const seq = generateRandomSequence(c.key, c.mode, c.steps, lo, hi);
    c.impromptuInputs = seq.impromptuInputs;
    c.impromptuInputsCycle = seq.impromptuInputsCycle;
    c.impromptuOctaves = seq.impromptuOctaves;
    c.velocityOn = Math.random() < 0.5;
    const vLo = randInt(30, 100);
    c.velocityMin = vLo;
    c.velocityMax = randInt(vLo, 127);
    c.release = randInt(20, 100);
    this._emitState();
  }

  randomizeAll() {
    for (const track of this.tracks) {
      const c = track.conf;
      const [lo, hi] = this._randomizeOctRange();
      c.octaveMin = lo;
      c.octaveMax = hi;
      c.steps = randInt(this.stepsMin, this.stepsMax);
      const seq = generateRandomSequence(c.key, c.mode, c.steps, lo, hi);
      c.impromptuInputs = seq.impromptuInputs;
      c.impromptuInputsCycle = seq.impromptuInputsCycle;
      c.impromptuOctaves = seq.impromptuOctaves;
      c.velocityOn = Math.random() < 0.5;
      const vLo = randInt(30, 100);
      c.velocityMin = vLo;
      c.velocityMax = randInt(vLo, 127);
      c.release = randInt(20, 100);
    }
    this._emitState();
  }

  setTrackSteps(id, steps) {
    const track = this.getTrack(id);
    if (!track) return;
    steps = Math.max(1, Math.min(64, steps));
    track.conf.steps = steps;

    let flat = [];
    for (const idx of track.conf.impromptuInputsCycle) {
      const row = track.conf.impromptuInputs[idx];
      if (row) flat = flat.concat(row);
    }

    let octs = track.conf.impromptuOctaves || [];
    if (flat.length > steps) {
      flat = flat.slice(0, steps);
      octs = octs.slice(0, steps);
    } else {
      const scaleNotes = getScaleNotes(track.conf.key, track.conf.mode);
      while (flat.length < steps) {
        flat.push(scaleNotes[Math.floor(Math.random() * scaleNotes.length)]);
        octs.push(randInt(track.conf.octaveMin, track.conf.octaveMax));
      }
    }
    track.conf.impromptuInputs = [flat];
    track.conf.impromptuInputsCycle = [0];
    track.conf.impromptuOctaves = octs;
    this._emitState();
  }

  connectPort(trackId, portIndex) {
    const track = this.getTrack(trackId);
    if (!track) return { ok: false, error: "track not found" };
    track.conf.internalAudio = false;
    return track.output.connect(portIndex);
  }

  disconnectPort(trackId) {
    const track = this.getTrack(trackId);
    if (!track) return;
    track.output.disconnect();
  }

  startTrack(id) {
    const track = this.getTrack(id);
    if (!track) return;
    track._playing = true;
    track._paused = false;
    this._ensureClock();
    this._emitState();
  }

  pauseTrack(id) {
    const track = this.getTrack(id);
    if (!track) return;
    track._playing = false;
    track._paused = true;
    track.allNotesOff();
    this._emitState();
  }

  stopTrack(id) {
    const track = this.getTrack(id);
    if (!track) return;
    track._playing = false;
    track._paused = false;
    track._cycle = 0;
    track.allNotesOff();
    this._emitState();
  }

  _ensureClock() {
    if (this._interval) return;
    this._subTick = 0;
    this._paused = false;
    const beatMs = 1000 / (this.BPM / 60);
    this._interval = setInterval(() => this._playCycle(), beatMs / 3);
  }

  setGlobalKeyMode(enabled) {
    this.globalKeyMode = !!enabled;
    if (this.globalKeyMode) {
      this.setGlobalKey(this.globalKey, this.globalMode);
    }
    this._emitState();
  }

  setGlobalKey(key, mode) {
    const newKey = key || this.globalKey;
    const newMode = mode || this.globalMode;
    this.globalKey = newKey;
    this.globalMode = newMode;
    if (this.globalKeyMode) {
      for (const track of this.tracks) {
        const oldKey = track.conf.key;
        const oldMode = track.conf.mode;
        if (oldKey !== newKey || oldMode !== newMode) {
          track.conf.impromptuInputs = transposeInputs(
            track.conf.impromptuInputs,
            oldKey,
            oldMode,
            newKey,
            newMode,
          );
          track.conf.key = newKey;
          track.conf.mode = newMode;
        }
      }
    }
    this._emitState();
  }

  setBPM(bpm) {
    bpm = Math.max(10, Math.min(300, Number(bpm) || this.BPM));
    this.BPM = bpm;
    if (this._interval) {
      clearInterval(this._interval);
      const beatMs = 1000 / (this.BPM / 60);
      this._interval = setInterval(() => this._playCycle(), beatMs / 3);
    }
    this._emitState();
  }

  setPianoRange(start, end) {
    start = Math.max(0, Math.min(8, Number(start) || 2));
    end = Math.max(start, Math.min(8, Number(end) || 5));
    this.pianoOctStart = start;
    this.pianoOctEnd = end;
  }

  setGenerativeMode(enabled) {
    this.generativeMode = !!enabled;
    if (this.generativeMode) {
      this._savedConfs = new Map();
      for (const track of this.tracks) {
        this._savedConfs.set(track.id, JSON.parse(JSON.stringify(track.conf)));
        track._genRhythm = this._generateRhythm();
      }
      if (!this.isPlaying()) this.start();
    } else if (this._savedConfs) {
      for (const track of this.tracks) {
        const saved = this._savedConfs.get(track.id);
        if (saved) track.conf = saved;
      }
      this._savedConfs = null;
    }
    this._emitState();
  }

  _generateRhythm() {
    const len = randInt(4, 12);
    const density = 0.3 + Math.random() * 0.5;
    const pattern = [];
    for (let i = 0; i < len; i++) {
      pattern.push(Math.random() < density ? 1 : 0);
    }
    if (pattern.every((v) => v === 0)) pattern[0] = 1;
    pattern._density = pattern.filter((v) => v === 1).length / pattern.length;
    return pattern;
  }

  _evolveTrack(track) {
    const c = track.conf;
    const scaleNotes = getScaleNotes(c.key, c.mode);
    const pool = [...scaleNotes, ""];

    let flat = [];
    for (const idx of c.impromptuInputsCycle) {
      const row = c.impromptuInputs[idx];
      if (row) flat = flat.concat(row);
    }
    if (flat.length === 0) return;

    if (Math.random() < 0.3) {
      track._genRhythm = this._generateRhythm();
    }
    if (Math.random() < 0.25) {
      c.timeDivision = randInt(1, 4);
    }
    if (Math.random() < 0.3) {
      if (this.genRelease) {
        const bias = this.genReleaseBias ?? 50;
        const center = 20 + Math.round((bias / 100) * 80);
        const lo = Math.max(10, center - 25);
        const hi = Math.min(100, center + 25);
        c.release = randInt(lo, hi);
      } else {
        c.release = randInt(20, 100);
      }
    }

    if (Math.random() < 0.3) {
      const [lo, hi] = this._randomizeOctRange();
      c.octaveMin = lo;
      c.octaveMax = hi;
    }

    if (Math.random() < 0.15) {
      const newSteps = randInt(this.stepsMin, this.stepsMax);
      const seq = generateRandomSequence(
        c.key,
        c.mode,
        newSteps,
        c.octaveMin,
        c.octaveMax,
      );
      c.impromptuInputs = seq.impromptuInputs;
      c.impromptuInputsCycle = seq.impromptuInputsCycle;
      c.impromptuOctaves = seq.impromptuOctaves;
      c.steps = newSteps;
    } else {
      const mutations = randInt(1, Math.max(1, Math.ceil(flat.length * 0.25)));
      for (let m = 0; m < mutations; m++) {
        const idx = Math.floor(Math.random() * flat.length);
        flat[idx] = pool[Math.floor(Math.random() * pool.length)];
        if (c.impromptuOctaves && c.impromptuOctaves[idx] !== undefined) {
          c.impromptuOctaves[idx] = randInt(c.octaveMin, c.octaveMax);
        }
      }
      c.impromptuInputs = [flat];
      c.impromptuInputsCycle = [0];
    }
  }

  setStepsRange(min, max) {
    this.stepsMin = Math.max(1, min);
    this.stepsMax = Math.min(128, max);
    if (this.stepsMin > this.stepsMax) this.stepsMax = this.stepsMin;
    this._emitState();
  }

  start() {
    for (const track of this.tracks) {
      track._playing = true;
      track._paused = false;
    }
    if (!this._interval) {
      if (!this._paused) this._subTick = 0;
      this._paused = false;
      const beatMs = 1000 / (this.BPM / 60);
      this._interval = setInterval(() => this._playCycle(), beatMs / 3);
    }
    this._emitState();
  }

  pause() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    for (const track of this.tracks) {
      if (track._playing) {
        track._playing = false;
        track._paused = true;
      }
      track.allNotesOff();
    }
    this._paused = true;
    this._emitState();
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this._subTick = 0;
    this._paused = false;
    for (const track of this.tracks) {
      track._playing = false;
      track._paused = false;
      track._cycle = 0;
      track.allNotesOff();
    }
    this._emitState();
  }

  isPlaying() {
    return this._interval !== null;
  }

  isPaused() {
    return !this._interval && this._paused;
  }

  getState() {
    return {
      BPM: this.BPM,
      playing: this.isPlaying(),
      paused: this.isPaused(),
      globalKeyMode: this.globalKeyMode,
      globalKey: this.globalKey,
      globalMode: this.globalMode,
      stepsMin: this.stepsMin,
      stepsMax: this.stepsMax,
      generativeMode: this.generativeMode,
      metronome: this.metronome,
      genVelocity: this.genVelocity,
      genVelocitySpread: this.genVelocitySpread,
      genRelease: this.genRelease,
      genReleaseBias: this.genReleaseBias,
      tracks: this.tracks.map((t) => {
        const key = t.conf.key || "C";
        const mode = t.conf.mode || "major";
        const scaleLen = (SCALES[mode] || SCALES.major).length;
        const arpChords = [];
        for (let d = 0; d < scaleLen; d++) {
          arpChords.push({ degree: d, label: chordLabel(key, mode, d) });
        }
        let arpSteps = 0;
        if (t.conf.arpMode) {
          const chordNotes = buildChordMidi(
            t.conf.key,
            t.conf.mode,
            t.conf.arpDegree ?? 0,
            t.conf.arpVoicing ?? 3,
            t.conf.octaveMin,
            t.conf.octaveMax,
          );
          arpSteps = buildArpSequence(
            chordNotes,
            t.conf.arpPattern || "up",
          ).length;
        }
        return {
          id: t.id,
          conf: { ...t.conf },
          connected: t.output.isConnected(),
          connectedPort: t.output.getConnectedPort(),
          trackPlaying: t._playing,
          trackPaused: t._paused,
          arpChords,
          arpSteps,
        };
      }),
    };
  }

  _playCycle() {
    const st = this._subTick;
    this._subTick++;
    if (this.metronome && st % 3 === 0) {
      this.emit("tick", { beat: Math.floor(st / 3) % 4 });
    }
    let evolved = false;
    for (const track of this.tracks) {
      if (!track._playing) continue;

      let shouldPlay = false;
      let effectiveBPM;

      if (this.generativeMode && track._genRhythm) {
        const pattern = track._genRhythm;
        const patIdx = st % pattern.length;
        shouldPlay = pattern[patIdx] === 1;
        effectiveBPM = this.BPM;
      } else {
        const div = track.conf.timeDivision || 4;
        const stepsPerPlay = 12 / div;
        shouldPlay = st % stepsPerPlay === 0;
        effectiveBPM = (this.BPM * div) / 4;
      }

      if (!shouldPlay) continue;

      const prevSeqPos = track._seqPos;
      const gv = this.generativeMode ? this.genVelocity : false;
      const gs = this.generativeMode ? this.genVelocitySpread : 50;
      const events = track.playCycle(effectiveBPM, gv, gs);

      if (
        this.generativeMode &&
        track._seqPos !== undefined &&
        track._seqPos === 0 &&
        prevSeqPos !== 0
      ) {
        this._evolveTrack(track);
        evolved = true;
      }

      for (const e of events) {
        if (e.rest) {
          this.emit("seqPos", { trackId: e.trackId, seqPos: e.seqPos });
        } else {
          this.emit("noteOn", e);
        }
      }
    }
    if (evolved) this._emitState();
  }

  _emitState() {
    this.emit("state", this.getState());
  }
}

module.exports = new TrackManager();
