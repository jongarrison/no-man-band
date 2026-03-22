const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
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

  socket.on("setConf", (patch) => {
    if (patch.BPM !== undefined) tm.setBPM(patch.BPM);
  });

  socket.on("start", () => tm.start());
  socket.on("stop", () => tm.stop());

  const onNoteOn = (data) => socket.emit("noteOn", data);
  const onSeqPos = (data) => socket.emit("seqPos", data);
  const onState = (data) => socket.emit("state", data);

  tm.on("noteOn", onNoteOn);
  tm.on("seqPos", onSeqPos);
  tm.on("state", onState);

  socket.on("disconnect", () => {
    console.log("client disconnected");
    tm.off("noteOn", onNoteOn);
    tm.off("seqPos", onSeqPos);
    tm.off("state", onState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
