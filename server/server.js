const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const vm = require("vm");
const util = require("util");
const { getPorts } = require("../lib/midiHelper");
const tm = require("./trackManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

app.use(express.static(path.join(__dirname, "../client/dist")));

if (tm.tracks.length === 0) {
  tm.addTrack();
}

function createTrackProxy(trackId) {
  const self = {
    get id() {
      return trackId;
    },
    get key() {
      return tm.getTrack(trackId)?.conf.key;
    },
    set key(v) {
      tm.setTrackConf(trackId, { key: v });
    },
    get mode() {
      return tm.getTrack(trackId)?.conf.mode;
    },
    set mode(v) {
      tm.setTrackConf(trackId, { mode: v });
    },
    get octave() {
      const t = tm.getTrack(trackId);
      return t ? [t.conf.octaveMin, t.conf.octaveMax] : undefined;
    },
    set octave(v) {
      if (Array.isArray(v) && v.length === 2) {
        tm.setTrackConf(trackId, { octaveMin: v[0], octaveMax: v[1] });
      } else {
        tm.setTrackConf(trackId, {
          octaveMin: Number(v),
          octaveMax: Number(v),
        });
      }
    },
    get channel() {
      return tm.getTrack(trackId)?.conf.midiChannel;
    },
    set channel(v) {
      tm.setTrackConf(trackId, { midiChannel: v });
    },
    get inputs() {
      return tm.getTrack(trackId)?.conf.impromptuInputs;
    },
    set inputs(v) {
      tm.setTrackConf(trackId, { impromptuInputs: v });
    },
    get cycle() {
      return tm.getTrack(trackId)?.conf.impromptuInputsCycle;
    },
    set cycle(v) {
      tm.setTrackConf(trackId, { impromptuInputsCycle: v });
    },
    get improv() {
      return tm.getTrack(trackId)?.conf.playImpromptuOn;
    },
    set improv(v) {
      tm.setTrackConf(trackId, { playImpromptuOn: !!v });
    },
    get beat() {
      return tm.getTrack(trackId)?.conf.playBeatOn;
    },
    set beat(v) {
      tm.setTrackConf(trackId, { playBeatOn: !!v });
    },
    get scale() {
      return tm.getTrack(trackId)?.conf.playScaleOn;
    },
    set scale(v) {
      tm.setTrackConf(trackId, { playScaleOn: !!v });
    },
    randomize() {
      tm.randomizeTrack(trackId);
      return "ok";
    },
    play() {
      tm.startTrack(trackId);
      return "playing";
    },
    pause() {
      tm.pauseTrack(trackId);
      return "paused";
    },
    stop() {
      tm.stopTrack(trackId);
      return "stopped";
    },
    get active() {
      return tm.getTrack(trackId)?.conf.active;
    },
    set active(v) {
      tm.setTrackConf(trackId, { active: !!v });
    },
    get division() {
      return tm.getTrack(trackId)?.conf.timeDivision;
    },
    set division(v) {
      const n = Math.max(1, Math.min(4, Number(v)));
      tm.setTrackConf(trackId, { timeDivision: n });
    },
    get steps() {
      const t = tm.getTrack(trackId);
      if (!t) return 0;
      if (t.conf.steps) return t.conf.steps;
      let flat = [];
      for (const idx of t.conf.impromptuInputsCycle) {
        const row = t.conf.impromptuInputs[idx];
        if (row) flat = flat.concat(row);
      }
      return flat.length;
    },
    set steps(v) {
      tm.setTrackSteps(trackId, Number(v));
    },
    connect(port) {
      return tm.connectPort(trackId, port);
    },
    disconnect() {
      tm.disconnectPort(trackId);
      return "ok";
    },
    toString() {
      const track = tm.getTrack(trackId);
      if (!track) return `track ${trackId} not found`;
      const c = track.conf;
      const muted = c.active ? "" : " [MUTED]";
      const div = c.timeDivision || 4;
      return `T${trackId} ${c.key} ${c.mode} oct=${c.octaveMin}-${c.octaveMax} ch=${c.midiChannel} div=${div}/4${muted}`;
    },
  };
  return self;
}

const evalSandbox = {
  t(id) {
    return createTrackProxy(id);
  },
  get bpm() {
    return tm.BPM;
  },
  set bpm(v) {
    tm.setBPM(Number(v));
  },
  get globalKey() {
    return tm.globalKeyMode ? `${tm.globalKey} ${tm.globalMode}` : "per-track";
  },
  set globalKey(v) {
    if (v === false || v === "off") {
      tm.setGlobalKeyMode(false);
      return;
    }
    const parts = String(v).trim().split(/\s+/);
    tm.setGlobalKeyMode(true);
    tm.setGlobalKey(parts[0], parts[1]);
  },
  start() {
    tm.start();
    return "started";
  },
  pause() {
    tm.pause();
    return "paused";
  },
  stop() {
    tm.stop();
    return "stopped";
  },
  addTrack() {
    const id = tm.addTrack();
    return `added track ${id}`;
  },
  removeTrack(id) {
    tm.removeTrack(id);
    return "ok";
  },
  ports() {
    return getPorts();
  },
  tracks() {
    return tm.tracks.map((t) => createTrackProxy(t.id).toString());
  },
  randomize() {
    tm.randomizeAll();
    return "randomized all tracks";
  },
  get generative() {
    return tm.generativeMode;
  },
  set generative(v) {
    tm.setGenerativeMode(!!v);
  },
  help() {
    return [
      "=== GLOBAL ===",
      "bpm              get/set tempo (60-300). e.g. bpm = 140",
      "globalKey        get/set global key. e.g. globalKey = 'D minor'",
      "                 set to false or 'off' for per-track keys",
      "start()          start / resume playback",
      "pause()          pause playback (keeps position)",
      "stop()           stop and reset to beginning",
      "addTrack()       add a new track",
      "removeTrack(n)   remove track by id",
      "ports()          list available MIDI ports",
      "tracks()         show all tracks summary",
      "randomize()      randomize sequences for all tracks",
      "",
      "=== TRACKS ===",
      "t1, t2, ...      access track by number",
      "t(n)             access track by id",
      "",
      "--- Properties (get/set) ---",
      "t1.key           root note: C Cs D Ds E F Fs G Gs A As B",
      "t1.mode          'major' or 'minor' (auto-transposes sequence)",
      "t1.octave        octave range [min,max] or single number",
      "t1.channel       MIDI channel 1-16",
      "t1.active        mute/unmute track (true/false)",
      "t1.division      time division 1-4 (4=full, 2=half, 1=quarter speed)",
      "t1.steps         number of steps in sequence (1-64)",
      "t1.improv        toggle improv mode (true/false)",
      "t1.beat          toggle beat mode",
      "t1.scale         toggle scale mode",
      "t1.inputs        note rows, e.g. [['C','E','G',''],['D','F','A','']]",
      "                 empty string = rest",
      "t1.cycle         row selection pattern, e.g. [0,0,0,1]",
      "",
      "--- Methods ---",
      "t1.play()        start this track",
      "t1.pause()       pause this track (keeps position)",
      "t1.stop()        stop and reset this track",
      "t1.randomize()   generate random sequence in current key",
      "t1.connect(n)    connect to MIDI port n",
      "t1.disconnect()  disconnect from MIDI port",
    ].join("\n");
  },
};

for (let i = 1; i <= 16; i++) {
  Object.defineProperty(evalSandbox, `t${i}`, {
    get() {
      return createTrackProxy(i);
    },
    enumerable: false,
    configurable: true,
  });
}

const evalContext = vm.createContext(evalSandbox);

function formatResult(val) {
  if (val === undefined) return undefined;
  if (typeof val === "string") return val;
  return util.inspect(val, { depth: 3, colors: false, maxArrayLength: 20 });
}

io.on("connection", (socket) => {
  console.log("client connected");

  socket.emit("ports", getPorts());
  socket.emit("state", tm.getState());

  socket.on("addTrack", () => {
    tm.addTrack();
  });

  socket.on("removeTrack", ({ trackId }) => {
    tm.removeTrack(trackId);
  });

  socket.on("connectPort", ({ trackId, portIndex }) => {
    tm.connectPort(trackId, portIndex);
    socket.emit("state", tm.getState());
  });

  socket.on("disconnectPort", ({ trackId }) => {
    tm.disconnectPort(trackId);
    socket.emit("state", tm.getState());
  });

  socket.on("setTrackConf", ({ trackId, patch }) => {
    tm.setTrackConf(trackId, patch);
  });

  socket.on("randomize", ({ trackId }) => {
    tm.randomizeTrack(trackId);
  });

  socket.on("randomizeAll", () => {
    tm.randomizeAll();
  });

  socket.on("setTrackSteps", ({ trackId, steps }) => {
    tm.setTrackSteps(trackId, steps);
  });

  socket.on("setConf", (patch) => {
    if (patch.BPM !== undefined) tm.setBPM(patch.BPM);
    if (patch.globalKeyMode !== undefined)
      tm.setGlobalKeyMode(patch.globalKeyMode);
    if (patch.globalKey !== undefined || patch.globalMode !== undefined) {
      tm.setGlobalKey(patch.globalKey, patch.globalMode);
    }
    if (patch.pianoOctStart !== undefined || patch.pianoOctEnd !== undefined) {
      tm.setPianoRange(
        patch.pianoOctStart ?? tm.pianoOctStart,
        patch.pianoOctEnd ?? tm.pianoOctEnd,
      );
    }
    if (patch.stepsMin !== undefined || patch.stepsMax !== undefined) {
      tm.setStepsRange(
        patch.stepsMin ?? tm.stepsMin,
        patch.stepsMax ?? tm.stepsMax,
      );
    }
    if (patch.generativeMode !== undefined) {
      tm.setGenerativeMode(patch.generativeMode);
    }
    if (patch.metronome !== undefined) {
      tm.metronome = !!patch.metronome;
      tm._emitState();
    }
  });

  socket.on("start", () => tm.start());
  socket.on("pause", () => tm.pause());
  socket.on("stop", () => tm.stop());

  socket.on("startTrack", ({ trackId }) => tm.startTrack(trackId));
  socket.on("pauseTrack", ({ trackId }) => tm.pauseTrack(trackId));
  socket.on("stopTrack", ({ trackId }) => tm.stopTrack(trackId));

  socket.on("eval", (code) => {
    try {
      const result = vm.runInContext(code, evalContext, { timeout: 200 });
      const output = formatResult(result);
      socket.emit("evalResult", { input: code, output });
    } catch (err) {
      socket.emit("evalResult", { input: code, error: err.message });
    }
  });

  const onNoteOn = (data) => socket.emit("noteOn", data);
  const onSeqPos = (data) => socket.emit("seqPos", data);
  const onState = (data) => socket.emit("state", data);
  const onTick = (data) => socket.emit("tick", data);

  tm.on("noteOn", onNoteOn);
  tm.on("seqPos", onSeqPos);
  tm.on("state", onState);
  tm.on("tick", onTick);

  socket.on("disconnect", () => {
    console.log("client disconnected");
    tm.off("noteOn", onNoteOn);
    tm.off("seqPos", onSeqPos);
    tm.off("state", onState);
    tm.off("tick", onTick);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
