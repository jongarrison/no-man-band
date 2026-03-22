import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { ThemeProvider } from "./ThemeContext.jsx";
import { setTrackColorConfig, THEME_TRACK_COLORS } from "./trackColor.js";
import GlobalControls from "./components/GlobalControls.jsx";
import TrackControls from "./components/TrackControls.jsx";
import TrackDetail from "./components/TrackDetail.jsx";
import CliPanel from "./components/CliPanel.jsx";
import Piano from "./components/Piano.jsx";
import Visualizer from "./components/Visualizer.jsx";
import GenerativeVisualizer from "./components/GenerativeVisualizer.jsx";
import useMetronome from "./useMetronome.js";

const CONTAINER_WIDTH = 860;
const DEFAULT_OCTAVE_START = 2;
const DEFAULT_OCTAVE_END = 5;

export default function App() {
  const socketRef = useRef(null);
  const [ports, setPorts] = useState([]);
  const [state, setState] = useState(null);
  const [activeNotes, setActiveNotes] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [seqPositions, setSeqPositions] = useState({});
  const [cliMode, setCliMode] = useState(false);
  const [evalResults, setEvalResults] = useState([]);
  const [pianoOctStart, setPianoOctStart] = useState(DEFAULT_OCTAVE_START);
  const [pianoOctEnd, setPianoOctEnd] = useState(DEFAULT_OCTAVE_END);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("nmb-theme") || "clean",
  );
  const activeTimers = useRef({});
  const visualizerNoteRef = useRef(null);
  const genVizNoteRef = useRef(null);
  const metronome = useMetronome();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setTrackColorConfig(THEME_TRACK_COLORS[theme] || THEME_TRACK_COLORS.clean);
    localStorage.setItem("nmb-theme", theme);
  }, [theme]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("ports", setPorts);
    socket.on("state", (s) => {
      setState(s);
      metronome.setEnabled(!!s.metronome);
      if (!s.playing && !s.paused) {
        setSeqPositions({});
      }
      if (s.tracks.length > 0) {
        setSelectedTrackId((prev) => {
          if (prev && s.tracks.some((t) => t.id === prev)) return prev;
          return s.tracks[0].id;
        });
      }
    });
    socket.on("noteOn", (data) => {
      setActiveNotes((prev) => {
        const filtered = prev.filter(
          (n) => !(n.note === data.note && n.trackId === data.trackId),
        );
        return [...filtered, data];
      });

      if (data.seqPos != null) {
        setSeqPositions((prev) => ({ ...prev, [data.trackId]: data.seqPos }));
      }

      if (visualizerNoteRef.current) {
        visualizerNoteRef.current(data);
      }
      if (genVizNoteRef.current) {
        genVizNoteRef.current(data);
      }

      const timerKey = `${data.note}:${data.trackId}`;
      clearTimeout(activeTimers.current[timerKey]);
      activeTimers.current[timerKey] = setTimeout(() => {
        setActiveNotes((prev) =>
          prev.filter(
            (n) => !(n.note === data.note && n.trackId === data.trackId),
          ),
        );
      }, 150);
    });
    socket.on("seqPos", (data) => {
      setSeqPositions((prev) => ({ ...prev, [data.trackId]: data.seqPos }));
    });
    socket.on("evalResult", (data) => {
      setEvalResults((prev) => [...prev, data]);
    });
    socket.on("tick", (data) => {
      metronome.tick(data);
    });

    return () => socket.disconnect();
  }, []);

  const emit = useCallback(
    (event, data) => socketRef.current?.emit(event, data),
    [],
  );

  const selectedTrack = state?.tracks.find((t) => t.id === selectedTrackId);
  const generativeMode = state?.generativeMode;

  return (
    <ThemeProvider value={theme}>
      {!generativeMode && (
        <Visualizer
          onNoteRef={visualizerNoteRef}
          theme={theme}
          octaveStart={pianoOctStart}
          octaveEnd={pianoOctEnd}
          pianoWidth={CONTAINER_WIDTH}
        />
      )}

      {generativeMode && (
        <GenerativeVisualizer
          tracks={state?.tracks || []}
          onNoteRef={genVizNoteRef}
          theme={theme}
        />
      )}

      <div style={pageWrapper}>
        {theme === "retro" ? (
          <img
            src="/title.png"
            alt="No Man Band"
            style={titleImgStyle}
            draggable={false}
          />
        ) : (
          <h1 style={titleTextStyle}>No Man Band</h1>
        )}
        {!state ? (
          <div style={cardStyle}>
            <p style={{ textAlign: "center", padding: 40 }}>Connecting...</p>
          </div>
        ) : generativeMode ? (
          <div style={genOverlayStyle}>
            <button
              style={genBackBtn}
              onClick={() => emit("setConf", { generativeMode: false })}
            >
              Exit Generative
            </button>
            <div style={genInfoRow}>
              <button
                style={{
                  ...genBackBtn,
                  background: state.metronome
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.08)",
                  padding: "5px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onClick={() => emit("setConf", { metronome: !state.metronome })}
                title={state.metronome ? "Metronome on" : "Metronome off"}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                  style={{ opacity: state.metronome ? 1 : 0.4 }}
                >
                  <path
                    d="M25 90 L50 10 L75 90 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinejoin="round"
                  />
                  <circle cx="28" cy="48" r="12" />
                </svg>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: state.metronome ? "#4f4" : "#666",
                    boxShadow: state.metronome ? "0 0 4px #4f4" : "none",
                  }}
                />
              </button>
              <label style={genLabel}>
                BPM {state.BPM}
                <input
                  type="range"
                  min={60}
                  max={300}
                  value={state.BPM}
                  onChange={(e) =>
                    emit("setConf", { BPM: Number(e.target.value) })
                  }
                  style={{ width: 120, cursor: "pointer" }}
                />
              </label>
              <button
                style={{
                  ...genBackBtn,
                  background: state.genVelocity
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.08)",
                  padding: "5px 10px",
                }}
                onClick={() =>
                  emit("setConf", { genVelocity: !state.genVelocity })
                }
                title={
                  state.genVelocity ? "Random velocity" : "Fixed velocity 100"
                }
              >
                Vel {state.genVelocity ? "ON" : "OFF"}
              </button>
              {state.genVelocity && (
                <label style={genLabel}>
                  Spread {state.genVelocitySpread ?? 50}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={state.genVelocitySpread ?? 50}
                    onChange={(e) =>
                      emit("setConf", {
                        genVelocitySpread: Number(e.target.value),
                      })
                    }
                    style={{ width: 80, cursor: "pointer" }}
                  />
                </label>
              )}
            </div>
          </div>
        ) : (
          <div style={cardStyle}>
            <GlobalControls
              BPM={state.BPM}
              playing={state.playing}
              emit={emit}
              cliMode={cliMode}
              onToggleMode={setCliMode}
              pianoOctStart={pianoOctStart}
              pianoOctEnd={pianoOctEnd}
              onPianoRangeChange={(s, e) => {
                setPianoOctStart(s);
                setPianoOctEnd(e);
                emit("setConf", { pianoOctStart: s, pianoOctEnd: e });
              }}
              globalKeyMode={state.globalKeyMode}
              globalKey={state.globalKey}
              globalMode={state.globalMode}
              stepsMin={state.stepsMin}
              stepsMax={state.stepsMax}
              metronome={state.metronome}
              theme={theme}
              onThemeChange={setTheme}
              generativeMode={generativeMode}
              onGenerativeToggle={(v) => emit("setConf", { generativeMode: v })}
            />
            {cliMode ? (
              <CliPanel emit={emit} evalResults={evalResults} />
            ) : (
              <>
                <div style={trackListStyle}>
                  {state.tracks.map((track) => (
                    <TrackControls
                      key={track.id}
                      track={track}
                      ports={ports}
                      emit={emit}
                      selected={track.id === selectedTrackId}
                      onSelect={() => setSelectedTrackId(track.id)}
                      seqPos={seqPositions[track.id]}
                    />
                  ))}
                </div>
                {selectedTrack && (
                  <TrackDetail
                    track={selectedTrack}
                    emit={emit}
                    seqPos={seqPositions[selectedTrack.id]}
                    globalKeyMode={state.globalKeyMode}
                    octaveStart={pianoOctStart}
                    octaveEnd={pianoOctEnd}
                  />
                )}
              </>
            )}
            <Piano
              width={CONTAINER_WIDTH}
              height={100}
              activeNotes={activeNotes}
              octaveStart={pianoOctStart}
              octaveEnd={pianoOctEnd}
            />
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

const pageWrapper = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "center",
  minHeight: "100vh",
  padding: "10px 20px 20px",
};

const titleTextStyle = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 44,
  fontWeight: 400,
  letterSpacing: 4,
  textTransform: "uppercase",
  color: "#7ab8e0",
  textShadow: "none",
  marginBottom: 10,
  textAlign: "center",
  userSelect: "none",
  position: "relative",
  zIndex: 1,
};

const titleImgStyle = {
  height: 160,
  marginBottom: 10,
  userSelect: "none",
  objectFit: "contain",
  mixBlendMode: "screen",
  position: "relative",
  zIndex: 1,
};

const cardStyle = {
  position: "relative",
  zIndex: 1,
  width: CONTAINER_WIDTH,
  background: "var(--card-bg)",
  borderRadius: 12,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "var(--card-shadow)",
  border: "var(--card-border)",
  backdropFilter: "blur(8px)",
};

const trackListStyle = {
  borderTop: "1px solid var(--border-subtle)",
  borderBottom: "1px solid var(--border-subtle)",
};

const genOverlayStyle = {
  position: "relative",
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
  padding: "20px 30px",
  background: "rgba(0,0,0,0.35)",
  borderRadius: 12,
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const genBackBtn = {
  padding: "8px 20px",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 1,
};

const genInfoRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const genLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "rgba(255,255,255,0.7)",
};
