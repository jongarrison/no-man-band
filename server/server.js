const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const midiHelper = require("../lib/midiHelper");
const engine = require("./engine");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

app.use(express.static(path.join(__dirname, "../client/dist")));

io.on("connection", (socket) => {
  console.log("client connected");

  socket.emit("ports", midiHelper.getPorts());
  socket.emit("conf", engine.getConf());

  socket.on("connectPort", ({ portIndex }) => {
    midiHelper.connect(portIndex);
    socket.emit("ports", midiHelper.getPorts());
  });

  socket.on("connectVirtual", () => {
    midiHelper.connectVirtualOutput();
  });

  socket.on("start", () => engine.start());
  socket.on("stop", () => engine.stop());

  socket.on("setConf", (patch) => {
    engine.setConf(patch);
  });

  const onNoteOn = (data) => socket.emit("noteOn", data);
  const onConf = (data) => socket.emit("conf", data);
  const onStarted = () => socket.emit("started");
  const onStopped = () => socket.emit("stopped");

  engine.on("noteOn", onNoteOn);
  engine.on("conf", onConf);
  engine.on("started", onStarted);
  engine.on("stopped", onStopped);

  socket.on("disconnect", () => {
    console.log("client disconnected");
    engine.off("noteOn", onNoteOn);
    engine.off("conf", onConf);
    engine.off("started", onStarted);
    engine.off("stopped", onStopped);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
