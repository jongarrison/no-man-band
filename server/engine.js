const EventEmitter = require("events");
const midiHelper = require("../lib/midiHelper");
const noteHelper = require("../lib/noteHelper");

class Engine extends EventEmitter {
  constructor() {
    super();
    this._interval = null;
    this._cycle = 0;
    this.conf = {
      BPM: 180,
      playImpromptuOn: true,
      playScaleOn: false,
      playBeatOn: false,
      impromptuInputs: [
        ["A", "B", "C", ""],
        ["C", "C", "A", ""],
      ],
      impromptuInputsCycle: [0, 0, 0, 1],
      impromptuOctave: 3,
    };
  }

  getConf() {
    return { ...this.conf };
  }

  setConf(patch) {
    Object.assign(this.conf, patch);
    if (patch.BPM !== undefined && this._interval) {
      this.stop();
      this.start();
    }
    this.emit("conf", this.getConf());
  }

  start() {
    if (this._interval) return;
    const cycleInterval = 1000 / (this.conf.BPM / 60);
    this._interval = setInterval(() => this._playCycle(), cycleInterval);
    this.emit("started");
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this._cycle = 0;
    this.emit("stopped");
  }

  _sendNote(noteNumber, velocity = 100) {
    midiHelper.sendMessage([144, noteNumber, velocity]);
    this.emit("noteOn", { note: noteNumber, velocity });
  }

  _playCycle() {
    this._cycle++;
    if (this.conf.playScaleOn) this._playScale(this._cycle);
    if (this.conf.playBeatOn) this._playBeat(this._cycle);
    if (this.conf.playImpromptuOn) this._playImpromptu(this._cycle);
  }

  _playScale(cycle) {
    const octave = 4;
    const idx = cycle % noteHelper.scale.length;
    const noteName = noteHelper.scale[idx];
    const noteNumber = noteHelper.notes[noteName] + octave * 12;
    this._sendNote(noteNumber);
  }

  _playBeat(cycle) {
    const pos = cycle % 4;
    const lowOctave = 5;
    const highOctave = 6;

    if (pos === 2) {
      this._sendNote(24 + lowOctave * 12);
    } else if (pos === 3) {
      this._sendNote(24 + highOctave * 12);
    }
  }

  _flattenImpromptu() {
    let result = [];
    for (const idx of this.conf.impromptuInputsCycle) {
      result = result.concat(this.conf.impromptuInputs[idx]);
    }
    return result;
  }

  _playImpromptu(cycle) {
    const inputs = this._flattenImpromptu();
    const pos = cycle % inputs.length;
    const noteName = inputs[pos];
    let noteNumber = noteHelper.notes[noteName];

    if (noteNumber) {
      noteNumber = noteNumber + this.conf.impromptuOctave * 12;
      this._sendNote(noteNumber);
    }
  }
}

module.exports = new Engine();
