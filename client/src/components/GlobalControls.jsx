import React, { useState, useRef } from "react";

const OCT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
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
const MODES = [
  "major",
  "minor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
  "harm minor",
  "mel minor",
  "maj pent",
  "min pent",
  "blues",
  "chromatic",
];

function displayNote(n) {
  if (n.length === 2 && n[1] === "s") return n[0] + "♯";
  if (n.length === 2 && n[1] === "b") return n[0] + "♭";
  return n;
}

export default function GlobalControls({
  BPM,
  playing,
  emit,
  cliMode,
  onToggleMode,
  pianoOctStart,
  pianoOctEnd,
  onPianoRangeChange,
  globalKeyMode,
  globalKey,
  globalMode,
  stepsMin = 4,
  stepsMax = 16,
  theme,
  onThemeChange,
  metronome,
  generativeMode,
  onGenerativeToggle,
}) {
  const [randFlash, setRandFlash] = useState(false);
  const randTimer = useRef(null);
  const [localMin, setLocalMin] = useState(String(stepsMin));
  const [localMax, setLocalMax] = useState(String(stepsMax));
  const prevMin = useRef(stepsMin);
  const prevMax = useRef(stepsMax);
  if (prevMin.current !== stepsMin) {
    prevMin.current = stepsMin;
    setLocalMin(String(stepsMin));
  }
  if (prevMax.current !== stepsMax) {
    prevMax.current = stepsMax;
    setLocalMax(String(stepsMax));
  }

  function commitSteps(rawMin, rawMax) {
    let mn = Math.max(1, Math.min(128, parseInt(rawMin, 10) || 1));
    let mx = Math.max(1, Math.min(128, parseInt(rawMax, 10) || 1));
    if (mn > mx) mx = mn;
    setLocalMin(String(mn));
    setLocalMax(String(mx));
    emit("setConf", { stepsMin: mn, stepsMax: mx });
  }

  function handleRandomizeAll() {
    emit("randomizeAll");
    setRandFlash(true);
    clearTimeout(randTimer.current);
    randTimer.current = setTimeout(() => setRandFlash(false), 150);
  }

  return (
    <div>
      <div style={row}>
        <button
          style={{
            ...btnBase,
            background: playing ? "var(--btn-disabled-bg)" : "var(--btn-bg)",
          }}
          onClick={() => emit("start")}
          disabled={playing}
          title="Play"
        >
          ▶
        </button>
        <button
          style={{
            ...btnBase,
            background: playing
              ? "var(--pause-active-bg)"
              : "var(--btn-disabled-bg)",
          }}
          onClick={() => emit("pause")}
          disabled={!playing}
          title="Pause"
        >
          ⏸
        </button>
        <button
          style={{ ...btnBase, background: "var(--stop-bg)" }}
          onClick={() => emit("stop")}
          title="Stop & Reset"
        >
          ⏹
        </button>

        <button
          style={{
            ...btnBase,
            background: metronome ? "var(--toggle-active-bg)" : "var(--btn-bg)",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            boxSizing: "border-box",
            height: 29,
          }}
          onClick={() => emit("setConf", { metronome: !metronome })}
          title={metronome ? "Metronome on" : "Metronome off"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 100 100"
            fill="currentColor"
            style={{ opacity: metronome ? 1 : 0.4 }}
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
              background: metronome ? "#4f4" : "#666",
              boxShadow: metronome ? "0 0 4px #4f4" : "none",
            }}
          />
        </button>

        <label style={labelStyle}>
          BPM {BPM}
          <input
            type="range"
            min={10}
            max={300}
            value={BPM}
            onChange={(e) => emit("setConf", { BPM: Number(e.target.value) })}
            style={{ width: 100, cursor: "pointer" }}
          />
        </label>

        <div style={{ flex: 1 }} />

        <div style={toggleGroup}>
          <button
            style={{
              ...toggleBtn,
              background:
                theme === "clean" ? "var(--toggle-active-bg)" : "transparent",
            }}
            onClick={() => onThemeChange("clean")}
          >
            Clean
          </button>
          <button
            style={{
              ...toggleBtn,
              background:
                theme === "retro" ? "var(--toggle-active-bg)" : "transparent",
            }}
            onClick={() => onThemeChange("retro")}
          >
            Retro
          </button>
        </div>

        <div style={toggleGroup}>
          <button
            style={{
              ...toggleBtn,
              background: !cliMode ? "var(--toggle-active-bg)" : "transparent",
            }}
            onClick={() => onToggleMode(false)}
          >
            GUI
          </button>
          <button
            style={{
              ...toggleBtn,
              background: cliMode ? "var(--toggle-active-bg)" : "transparent",
            }}
            onClick={() => onToggleMode(true)}
          >
            CLI
          </button>
        </div>

        <button
          style={{
            ...btnBase,
            background: "var(--btn-bg)",
            border: "1px solid rgba(255,255,255,0.15)",
            letterSpacing: 1,
          }}
          onClick={() => onGenerativeToggle && onGenerativeToggle(true)}
          title="Enter generative mode"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ verticalAlign: "middle", marginRight: 4 }}
          >
            <polyline points="2 12 5 6 8 18 11 8 14 16 17 4 20 14 22 12" />
          </svg>
          Generative
        </button>

        {!cliMode && (
          <button style={btnBase} onClick={() => emit("addTrack")}>
            + Track
          </button>
        )}
      </div>

      <div style={row}>
        <label style={labelStyle} translate="no">
          Key
          <div style={toggleGroup}>
            <button
              style={{
                ...toggleBtn,
                background: !globalKeyMode
                  ? "var(--toggle-active-bg)"
                  : "transparent",
              }}
              onClick={() => emit("setConf", { globalKeyMode: false })}
            >
              Per Track
            </button>
            <button
              style={{
                ...toggleBtn,
                background: globalKeyMode
                  ? "var(--toggle-active-bg)"
                  : "transparent",
              }}
              onClick={() => emit("setConf", { globalKeyMode: true })}
            >
              Global
            </button>
          </div>
          {globalKeyMode && (
            <>
              <select
                value={globalKey}
                onChange={(e) => emit("setConf", { globalKey: e.target.value })}
                style={smallSelect}
              >
                {ALL_NOTES.map((n) => (
                  <option key={n} value={n}>
                    {displayNote(n)}
                  </option>
                ))}
              </select>
              <select
                value={globalMode}
                onChange={(e) =>
                  emit("setConf", { globalMode: e.target.value })
                }
                style={smallSelect}
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}
        </label>

        <label style={labelStyle}>
          Range
          <select
            value={pianoOctStart}
            onChange={(e) => {
              const v = Number(e.target.value);
              onPianoRangeChange(v, Math.max(v, pianoOctEnd));
            }}
            style={smallSelect}
          >
            {OCT_OPTIONS.filter((o) => o <= pianoOctEnd).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          -
          <select
            value={pianoOctEnd}
            onChange={(e) => {
              const v = Number(e.target.value);
              onPianoRangeChange(Math.min(pianoOctStart, v), v);
            }}
            style={smallSelect}
          >
            {OCT_OPTIONS.filter((o) => o >= pianoOctStart).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Steps
          <input
            type="number"
            min={1}
            max={128}
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={() => commitSteps(localMin, localMax)}
            onKeyDown={(e) =>
              e.key === "Enter" && commitSteps(localMin, localMax)
            }
            style={{ ...smallSelect, width: 42, textAlign: "center" }}
          />
          -
          <input
            type="number"
            min={1}
            max={128}
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={() => commitSteps(localMin, localMax)}
            onKeyDown={(e) =>
              e.key === "Enter" && commitSteps(localMin, localMax)
            }
            style={{ ...smallSelect, width: 42, textAlign: "center" }}
          />
        </label>

        <div style={{ flex: 1 }} />

        <button
          style={{
            ...btnBase,
            background: randFlash ? "var(--randomize-flash)" : "var(--btn-bg)",
            transition: "background 0.15s",
          }}
          onClick={handleRandomizeAll}
          title="Randomize all tracks"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ verticalAlign: "middle", marginRight: 4 }}
          >
            <path d="M12 2a10 10 0 0 1 7.07 2.93l1.5-1.5A.75.75 0 0 1 22 4v5a1 1 0 0 1-1 1h-5a.75.75 0 0 1-.53-1.28l1.7-1.7A7.5 7.5 0 0 0 4.5 12H2A10 10 0 0 1 12 2z" />
            <path d="M12 22a10 10 0 0 1-7.07-2.93l-1.5 1.5A.75.75 0 0 1 2 20v-5a1 1 0 0 1 1-1h5a.75.75 0 0 1 .53 1.28l-1.7 1.7A7.5 7.5 0 0 0 19.5 12H22A10 10 0 0 1 12 22z" />
          </svg>
          Randomize All
        </button>
      </div>
    </div>
  );
}

const row = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 16px",
  flexShrink: 0,
};

const btnBase = {
  padding: "6px 12px",
  border: "none",
  borderRadius: 6,
  background: "var(--btn-bg)",
  color: "var(--btn-color)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--label-color)",
  whiteSpace: "nowrap",
};

const smallSelect = {
  padding: "3px 4px",
  border: "none",
  borderRadius: 4,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  fontSize: 12,
  cursor: "pointer",
};

const toggleGroup = {
  display: "flex",
  borderRadius: 6,
  overflow: "hidden",
  border: "1px solid var(--toggle-border)",
};

const toggleBtn = {
  padding: "4px 10px",
  border: "none",
  color: "var(--toggle-btn-color)",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  fontFamily: "'SF Mono', 'Menlo', monospace",
};
