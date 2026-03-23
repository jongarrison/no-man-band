import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
import useSynth from "./useSynth.js";
import { getScaleNotes } from "./scaleUtils.js";
import { Knob } from "primereact/knob";
import { trackRgb } from "./trackColor.js";

const CONTAINER_WIDTH = 1032;
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
  const metronomeRef = useRef(metronome);
  metronomeRef.current = metronome;
  const synth = useSynth();
  const synthRef = useRef(synth);
  synthRef.current = synth;
  const stateRef = useRef(null);
  const [genUiVisible, setGenUiVisible] = useState(true);
  const genIdleTimer = useRef(null);
  const [manualListening, setManualListening] = useState(false);
  const pianoKeyRef = useRef(null);

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
      stateRef.current = s;
      metronomeRef.current.setEnabled(!!s.metronome);
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

      const s = stateRef.current;
      if (s) {
        const t = s.tracks.find((tr) => tr.id === data.trackId);
        if (t && t.conf.internalAudio) {
          synthRef.current.playNote(
            data.note,
            data.velocity || 100,
            data.durationMs || 200,
            t.conf.synthLpf ?? 100,
            t.conf.synthRes ?? 0,
            t.conf.synthAttack ?? 1,
            t.conf.synthDecay ?? 10,
            t.conf.synthSustain ?? 80,
            t.conf.synthRelease ?? 15,
            {
              volume: t.conf.synthVolume ?? 80,
              delayOn: !!t.conf.synthDelayOn,
              delayTime: t.conf.synthDelayTime ?? 30,
              delayFb: t.conf.synthDelayFeedback ?? 25,
              delayMix: t.conf.synthDelayMix ?? 30,
              reverbOn: !!t.conf.synthReverbOn,
              reverbSize: t.conf.synthReverbSize ?? 50,
              reverbTone: t.conf.synthReverbTone ?? 70,
              reverbMix: t.conf.synthReverbMix ?? 25,
            },
            t.conf.synthVoice ?? "keys",
          );
        }
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
      metronomeRef.current.tick(data);
    });

    return () => {
      socket.disconnect();
      Object.values(activeTimers.current).forEach(clearTimeout);
      activeTimers.current = {};
    };
  }, []);

  const emit = useCallback(
    (event, data) => socketRef.current?.emit(event, data),
    [],
  );

  const selectedTrack = state?.tracks.find((t) => t.id === selectedTrackId);
  const generativeMode = state?.generativeMode;

  const scaleHighlight = useMemo(
    () =>
      manualListening && selectedTrack
        ? getScaleNotes(selectedTrack.conf.key, selectedTrack.conf.mode)
        : null,
    [manualListening, selectedTrack?.conf.key, selectedTrack?.conf.mode],
  );

  const highlightColor = useMemo(
    () =>
      manualListening && selectedTrack ? trackRgb(selectedTrack.id) : null,
    [manualListening, selectedTrack?.id],
  );

  useEffect(() => {
    setManualListening(false);
    pianoKeyRef.current = null;
  }, [selectedTrackId]);

  useEffect(() => {
    if (!generativeMode) {
      setGenUiVisible(true);
      return;
    }
    const show = () => {
      setGenUiVisible(true);
      clearTimeout(genIdleTimer.current);
      genIdleTimer.current = setTimeout(() => setGenUiVisible(false), 3000);
    };
    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("mousedown", show);
    return () => {
      window.removeEventListener("mousemove", show);
      window.removeEventListener("mousedown", show);
      clearTimeout(genIdleTimer.current);
    };
  }, [generativeMode]);

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
        {theme === "retro" && (
          <img
            src="/title.png"
            alt="No Man Band"
            style={titleImgStyle}
            draggable={false}
          />
        )}
        {!state ? (
          <div style={cardStyle}>
            <p style={{ textAlign: "center", padding: 40 }}>Connecting...</p>
          </div>
        ) : generativeMode ? (
          <div
            style={{
              ...genOverlayStyle,
              opacity: genUiVisible ? 1 : 0,
              transition: genUiVisible
                ? "opacity 0.3s ease"
                : "opacity 5s ease",
              pointerEvents: genUiVisible ? "auto" : "none",
            }}
          >
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
                  height: 32,
                  boxSizing: "border-box",
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
                  min={10}
                  max={300}
                  value={state.BPM}
                  onChange={(e) =>
                    emit("setConf", { BPM: Number(e.target.value) })
                  }
                  style={{ width: 120, cursor: "pointer" }}
                />
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Knob
                  value={
                    state.genVelocity ? (state.genVelocitySpread ?? 50) : 0
                  }
                  onChange={(e) =>
                    emit("setConf", {
                      genVelocity: true,
                      genVelocitySpread: e.value,
                    })
                  }
                  min={0}
                  max={100}
                  size={34}
                  strokeWidth={5}
                  valueColor={
                    state.genVelocity ? "#82aaff" : "rgba(255,255,255,0.15)"
                  }
                  rangeColor="rgba(255,255,255,0.1)"
                  textColor="rgba(255,255,255,0.65)"
                  valueTemplate="{value}"
                />
                <span
                  style={{
                    fontSize: 10,
                    color: state.genVelocity
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() =>
                    emit("setConf", { genVelocity: !state.genVelocity })
                  }
                  title={
                    state.genVelocity ? "Click to disable" : "Click to enable"
                  }
                >
                  Vel
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Knob
                  value={state.genRelease ? (state.genReleaseBias ?? 50) : 0}
                  onChange={(e) =>
                    emit("setConf", {
                      genRelease: true,
                      genReleaseBias: e.value,
                    })
                  }
                  min={0}
                  max={100}
                  size={34}
                  strokeWidth={5}
                  valueColor={
                    state.genRelease ? "#a78bfa" : "rgba(255,255,255,0.15)"
                  }
                  rangeColor="rgba(255,255,255,0.1)"
                  textColor="rgba(255,255,255,0.65)"
                  valueTemplate="{value}"
                />
                <span
                  style={{
                    fontSize: 10,
                    color: state.genRelease
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() =>
                    emit("setConf", { genRelease: !state.genRelease })
                  }
                  title={
                    state.genRelease ? "Click to disable" : "Click to enable"
                  }
                >
                  Rel
                </span>
              </div>
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
                    key={selectedTrack.id}
                    track={selectedTrack}
                    emit={emit}
                    seqPos={seqPositions[selectedTrack.id]}
                    globalKeyMode={state.globalKeyMode}
                    octaveStart={pianoOctStart}
                    octaveEnd={pianoOctEnd}
                    pianoKeyRef={pianoKeyRef}
                    onListeningChange={setManualListening}
                    onPreviewNote={
                      selectedTrack.conf.internalAudio
                        ? (midi) =>
                            synth.playNote(
                              midi,
                              80,
                              250,
                              selectedTrack.conf.synthLpf ?? 100,
                              selectedTrack.conf.synthRes ?? 0,
                              selectedTrack.conf.synthAttack ?? 1,
                              selectedTrack.conf.synthDecay ?? 10,
                              selectedTrack.conf.synthSustain ?? 80,
                              selectedTrack.conf.synthRelease ?? 15,
                              {
                                volume: selectedTrack.conf.synthVolume ?? 80,
                                delayOn: !!selectedTrack.conf.synthDelayOn,
                                delayTime:
                                  selectedTrack.conf.synthDelayTime ?? 30,
                                delayFb:
                                  selectedTrack.conf.synthDelayFeedback ?? 25,
                                delayMix:
                                  selectedTrack.conf.synthDelayMix ?? 30,
                                reverbOn: !!selectedTrack.conf.synthReverbOn,
                                reverbSize:
                                  selectedTrack.conf.synthReverbSize ?? 50,
                                reverbTone:
                                  selectedTrack.conf.synthReverbTone ?? 70,
                                reverbMix:
                                  selectedTrack.conf.synthReverbMix ?? 25,
                              },
                              selectedTrack.conf.synthVoice ?? "keys",
                            )
                        : null
                    }
                  />
                )}
              </>
            )}
            <Piano
              width={CONTAINER_WIDTH}
              height={100}
              activeNotes={manualListening ? [] : activeNotes}
              octaveStart={pianoOctStart}
              octaveEnd={pianoOctEnd}
              listening={manualListening}
              scaleHighlight={scaleHighlight}
              highlightColor={highlightColor}
              onKeyClick={
                manualListening ? (data) => pianoKeyRef.current?.(data) : null
              }
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
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  padding: "20px",
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
