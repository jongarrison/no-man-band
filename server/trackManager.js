const EventEmitter = require("events");
const noteHelper = require("../lib/noteHelper");
const { createOutput } = require("../lib/midiHelper");

let nextId = 1;

function createDefaultConf() {
  return {
    playImpromptuOn: true,
    playScaleOn: false,
    playBeatOn: false,
    impromptuInputs: [
      ["A", "B", "C", ""],
      ["C", "C", "A", ""],
    ],
    impromptuInputsCycle: [0, 0, 0, 1],
    impromptuOctave: 3,
    midiChannel: 1,
  };
}

class Track {
  constructor(id) {
    this.id = id;
    this.conf = createDefaultConf();
    this.output = createOutput(`track-${id}`);
    this._cycle = 0;
  }

  sendNote(noteNumber, bpm, velocity = 100) {
    const noteOn = 143 + this.conf.midiChannel;
    const noteOff = 127 + this.conf.midiChannel;
    console.log(
      `[track-${this.id}] sendNote midi=${noteNumber} ch=${this.conf.midiChannel} connected=${this.output.isConnected()} port=${this.output.getConnectedPort()}`,
    );
    this.output.sendMessage([noteOn, noteNumber, velocity]);

    const beatMs = 1000 / (bpm / 60);
    setTimeout(() => {
      this.output.sendMessage([noteOff, noteNumber, 0]);
    }, beatMs * 0.8);

    return { trackId: this.id, note: noteNumber, velocity };
  }

  playCycle(bpm) {
    const cycle = this._cycle;
    this._cycle++;
    const events = [];
    if (this.conf.playScaleOn) {
      const e = this._playScale(cycle, bpm);
      if (e) events.push(e);
    }
    if (this.conf.playBeatOn) {
      const e = this._playBeat(cycle, bpm);
      if (e) events.push(e);
    }
    if (this.conf.playImpromptuOn) {
      const e = this._playImpromptu(cycle, bpm);
      if (e) events.push(e);
    }
    return events;
  }

  allNotesOff() {
    const cc = 175 + this.conf.midiChannel;
    this.output.sendMessage([cc, 123, 0]);
  }

  destroy() {
    this.allNotesOff();
    this.output.disconnect();
  }

  _playScale(cycle, bpm) {
    const octave = 4;
    const idx = cycle % noteHelper.scale.length;
    const noteName = noteHelper.scale[idx];
    const noteNumber = noteHelper.notes[noteName] + octave * 12;
    return this.sendNote(noteNumber, bpm);
  }

  _playBeat(cycle, bpm) {
    const pos = cycle % 4;
    if (pos === 2) return this.sendNote(24 + 5 * 12, bpm);
    if (pos === 3) return this.sendNote(24 + 6 * 12, bpm);
    return null;
  }

  _playImpromptu(cycle, bpm) {
    let result = [];
    for (const idx of this.conf.impromptuInputsCycle) {
      result = result.concat(this.conf.impromptuInputs[idx]);
    }
    if (result.length === 0) return null;
    const pos = cycle % result.length;
    this._seqPos = pos;
    const noteName = result[pos];
    let noteNumber = noteHelper.notes[noteName];
    if (noteNumber) {
      noteNumber = noteNumber + this.conf.impromptuOctave * 12;
      const event = this.sendNote(noteNumber, bpm);
      event.seqPos = pos;
      return event;
    }
    return { trackId: this.id, seqPos: pos, rest: true };
  }
}

class TrackManager extends EventEmitter {
  constructor() {
    super();
    this.BPM = 180;
    this.tracks = [];
    this._interval = null;
  }

  addTrack() {
    const track = new Track(nextId++);
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
    if (!track) return;
    Object.assign(track.conf, patch);
    this._emitState();
  }

  connectPort(trackId, portIndex) {
    const track = this.getTrack(trackId);
    if (!track) return { ok: false, error: "track not found" };
    return track.output.connect(portIndex);
  }

  disconnectPort(trackId) {
    const track = this.getTrack(trackId);
    if (!track) return;
    track.output.disconnect();
  }

  setBPM(bpm) {
    this.BPM = bpm;
    if (this._interval) {
      this.stop();
      this.start();
    }
    this._emitState();
  }

  start() {
    if (this._interval) return;
    const cycleInterval = 1000 / (this.BPM / 60);
    this._interval = setInterval(() => this._playCycle(), cycleInterval);
    this._emitState();
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    for (const track of this.tracks) {
      track._cycle = 0;
      track.allNotesOff();
    }
    this._emitState();
  }

  isPlaying() {
    return this._interval !== null;
  }

  getState() {
    return {
      BPM: this.BPM,
      playing: this.isPlaying(),
      tracks: this.tracks.map((t) => ({
        id: t.id,
        conf: { ...t.conf },
        connected: t.output.isConnected(),
        connectedPort: t.output.getConnectedPort(),
      })),
    };
  }

  _playCycle() {
    for (const track of this.tracks) {
      const events = track.playCycle(this.BPM);
      for (const e of events) {
        if (e.rest) {
          this.emit("seqPos", { trackId: e.trackId, seqPos: e.seqPos });
        } else {
          this.emit("noteOn", e);
        }
      }
    }
  }

  _emitState() {
    this.emit("state", this.getState());
  }
}

module.exports = new TrackManager();
