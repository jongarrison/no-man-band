import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import Controls from "./components/Controls.jsx";
import Piano from "./components/Piano.jsx";
import Visualizer from "./components/Visualizer.jsx";

const CONTAINER_WIDTH = 720;
const CONTAINER_HEIGHT = 500;

export default function App() {
  const socketRef = useRef(null);
  const [ports, setPorts] = useState([]);
  const [conf, setConf] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const noteTimeoutRef = useRef(null);
  const visualizerNoteRef = useRef(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("ports", setPorts);
    socket.on("conf", setConf);
    socket.on("started", () => setPlaying(true));
    socket.on("stopped", () => setPlaying(false));
    socket.on("noteOn", (data) => {
      setActiveNote(data.note);
      if (visualizerNoteRef.current) {
        visualizerNoteRef.current(data);
      }
      clearTimeout(noteTimeoutRef.current);
      noteTimeoutRef.current = setTimeout(() => setActiveNote(null), 150);
    });

    return () => socket.disconnect();
  }, []);

  const emit = useCallback(
    (event, data) => socketRef.current?.emit(event, data),
    [],
  );

  if (!conf) {
    return (
      <div style={containerStyle}>
        <p style={{ textAlign: "center", paddingTop: 40 }}>Connecting...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <Visualizer
        width={CONTAINER_WIDTH}
        height={200}
        onNoteRef={visualizerNoteRef}
      />
      <div style={{ marginTop: "auto" }}>
        <Controls ports={ports} conf={conf} playing={playing} emit={emit} />
        <Piano width={CONTAINER_WIDTH} height={100} activeNote={activeNote} />
      </div>
    </div>
  );
}

const containerStyle = {
  width: CONTAINER_WIDTH,
  height: CONTAINER_HEIGHT,
  background: "#16213e",
  borderRadius: 12,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};
