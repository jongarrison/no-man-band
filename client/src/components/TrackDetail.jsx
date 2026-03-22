import React, { useState, useRef, useCallback } from "react";
import { trackCss } from "../trackColor.js";

function DualRangeSlider({ min, max, low, high, onChange, showTicks = true }) {
  const trackRef = useRef(null);
  const [lowOnTop, setLowOnTop] = useState(false);
  const pctLow = ((low - min) / (max - min)) * 100;
  const pctHigh = ((high - min) / (max - min)) * 100;

  const handlePointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const clickVal = min + pct * (max - min);
    setLowOnTop(clickVal <= (low + high) / 2);
  };

  return (
    <div style={sliderWrap} onPointerDown={handlePointerDown}>
      <div ref={trackRef} style={sliderTrack}>
        <div
          style={{
            ...sliderFill,
            left: `${pctLow}%`,
            width: `${pctHigh - pctLow}%`,
          }}
        />
      </div>
      <input
        type="range"
        className="dual-range"
        min={min}
        max={max}
        step={1}
        value={low}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Math.min(v, high), high);
        }}
        style={{ ...sliderInput, zIndex: lowOnTop ? 3 : 2 }}
      />
      <input
        type="range"
        className="dual-range"
        min={min}
        max={max}
        step={1}
        value={high}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(low, Math.max(v, low));
        }}
        style={{ ...sliderInput, zIndex: lowOnTop ? 2 : 3 }}
      />
      {showTicks && (
        <div style={sliderTicks}>
          {Array.from({ length: max - min + 1 }, (_, i) => (
            <span key={i} style={sliderTickLabel}>
              {min + i}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const sliderWrap = {
  position: "relative",
  width: 100,
  height: 32,
  marginTop: 2,
};

const sliderTrack = {
  position: "absolute",
  top: 8,
  left: 0,
  right: 0,
  height: 4,
  borderRadius: 2,
  background: "rgba(255,255,255,0.12)",
};

const sliderFill = {
  position: "absolute",
  top: 0,
  height: "100%",
  borderRadius: 2,
  background: "var(--slider-fill)",
};

const sliderInput = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: 20,
  margin: 0,
  padding: 0,
  appearance: "none",
  WebkitAppearance: "none",
  background: "transparent",
  pointerEvents: "none",
  zIndex: 2,
};

const sliderTicks = {
  position: "absolute",
  top: 20,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "space-between",
  fontSize: 8,
  color: "rgba(255,255,255,0.35)",
  pointerEvents: "none",
};

const sliderTickLabel = { textAlign: "center", width: 10 };

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

const NOTE_OPTIONS = ["", ...ALL_NOTES];

const SHOW_MANUAL_EDITOR = false;

function displayNote(n) {
  if (!n) return "·";
  if (n.length === 2 && n[1] === "s") return n[0] + "♯";
  if (n.length === 2 && n[1] === "b") return n[0] + "♭";
  return n;
}

function flattenSequence(inputs, cycle, octaves) {
  let result = [];
  for (const idx of cycle) {
    if (inputs[idx]) result = result.concat(inputs[idx]);
  }
  return result.map((n, i) => ({
    raw: n,
    display: displayNote(n),
    octave: octaves?.[i],
  }));
}

export default function TrackDetail({
  track,
  emit,
  seqPos,
  octaveStart = 2,
  octaveEnd = 5,
  globalKeyMode = false,
}) {
  const { id, conf } = track;
  const [flashing, setFlashing] = useState(false);
  const flashTimer = useRef(null);

  const patch = (update) => {
    emit("setTrackConf", { trackId: id, patch: update });
  };

  const randomize = () => {
    emit("randomize", { trackId: id });
    setFlashing(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashing(false), 200);
  };

  const updateNote = (rowIdx, colIdx, value) => {
    const newInputs = conf.impromptuInputs.map((row) => [...row]);
    newInputs[rowIdx][colIdx] = value;
    patch({ impromptuInputs: newInputs });
  };

  const addNoteToRow = (rowIdx) => {
    const newInputs = conf.impromptuInputs.map((row) => [...row]);
    newInputs[rowIdx].push("");
    patch({ impromptuInputs: newInputs });
  };

  const removeNoteFromRow = (rowIdx) => {
    const newInputs = conf.impromptuInputs.map((row) => [...row]);
    if (newInputs[rowIdx].length > 1) {
      newInputs[rowIdx].pop();
      patch({ impromptuInputs: newInputs });
    }
  };

  const updateCycle = (idx, value) => {
    const newCycle = [...conf.impromptuInputsCycle];
    newCycle[idx] = value;
    patch({ impromptuInputsCycle: newCycle });
  };

  const addCycleStep = () => {
    patch({ impromptuInputsCycle: [...conf.impromptuInputsCycle, 0] });
  };

  const removeCycleStep = () => {
    if (conf.impromptuInputsCycle.length > 1) {
      patch({ impromptuInputsCycle: conf.impromptuInputsCycle.slice(0, -1) });
    }
  };

  const flat = flattenSequence(
    conf.impromptuInputs,
    conf.impromptuInputsCycle,
    conf.impromptuOctaves,
  );

  return (
    <div style={wrapper}>
      <div style={headerRow}>
        <span
          style={{
            ...title,
            background: trackCss(id),
            padding: "3px 10px",
            borderRadius: 4,
            color: "#fff",
          }}
        >
          Track {id}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!globalKeyMode && (
            <>
              <label style={labelStyle} translate="no">
                Key
                <select
                  value={conf.key}
                  onChange={(e) => patch({ key: e.target.value })}
                  style={selectStyle}
                >
                  {ALL_NOTES.map((n) => (
                    <option key={n} value={n}>
                      {displayNote(n)}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                <select
                  value={conf.mode}
                  onChange={(e) => patch({ mode: e.target.value })}
                  style={selectStyle}
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label style={labelStyle}>
            Oct{" "}
            {(conf.octaveMin ?? octaveStart) === (conf.octaveMax ?? octaveEnd)
              ? (conf.octaveMin ?? octaveStart)
              : `${conf.octaveMin ?? octaveStart}–${conf.octaveMax ?? octaveEnd}`}
            <DualRangeSlider
              min={octaveStart}
              max={octaveEnd}
              low={conf.octaveMin ?? octaveStart}
              high={conf.octaveMax ?? octaveEnd}
              onChange={(lo, hi) => patch({ octaveMin: lo, octaveMax: hi })}
            />
          </label>
          <label style={labelStyle}>
            Steps
            <input
              type="number"
              min={1}
              max={64}
              value={flat.length}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 64) {
                  emit("setTrackSteps", { trackId: id, steps: v });
                }
              }}
              style={{ ...selectStyle, width: 50, textAlign: "center" }}
            />
          </label>
          <label style={{ ...labelStyle, gap: 4 }}>
            Vel
            <button
              style={{
                ...velToggle,
                background: conf.velocityOn
                  ? "var(--toggle-active-bg)"
                  : "var(--btn-bg)",
              }}
              onClick={() => patch({ velocityOn: !conf.velocityOn })}
            >
              {conf.velocityOn ? "ON" : "OFF"}
            </button>
            {conf.velocityOn && (
              <>
                <span style={{ fontSize: 10, opacity: 0.6 }}>
                  {conf.velocityMin ?? 60}–{conf.velocityMax ?? 120}
                </span>
                <DualRangeSlider
                  min={1}
                  max={127}
                  low={conf.velocityMin ?? 60}
                  high={conf.velocityMax ?? 120}
                  onChange={(lo, hi) =>
                    patch({ velocityMin: lo, velocityMax: hi })
                  }
                  showTicks={false}
                />
              </>
            )}
          </label>
          <button
            style={{
              ...randomizeBtn,
              background: flashing
                ? "var(--randomize-flash)"
                : "var(--randomize-bg)",
              transition: "background 0.15s",
            }}
            onClick={randomize}
          >
            Randomize
          </button>
        </div>
      </div>

      <div style={sequenceDisplay} translate="no">
        {flat.map(({ raw, display, octave }, i) => {
          const active = seqPos != null && i === seqPos;
          const isRest = !raw;
          const base = isRest ? noteRest : noteChip;
          const style = active
            ? {
                ...base,
                background: trackCss(id, 0.7, 0.5),
                color: "#fff",
                transition: "background 0.06s, color 0.06s",
              }
            : base;
          return (
            <span key={i} style={style}>
              {display}
              {!isRest && octave != null && (
                <span style={octLabel}>{octave}</span>
              )}
            </span>
          );
        })}
      </div>

      {SHOW_MANUAL_EDITOR && (
        <>
          <div style={sectionStyle}>
            <span style={sectionLabel}>Sequences</span>
            {conf.impromptuInputs.map((row, rowIdx) => (
              <div key={rowIdx} style={rowStyle}>
                <span style={rowLabel}>{rowIdx}:</span>
                {row.map((note, colIdx) => (
                  <select
                    key={colIdx}
                    value={note}
                    onChange={(e) => updateNote(rowIdx, colIdx, e.target.value)}
                    style={noteSelect}
                    translate="no"
                  >
                    {NOTE_OPTIONS.map((n) => (
                      <option key={n} value={n} translate="no">
                        {n ? displayNote(n) : "—"}
                      </option>
                    ))}
                  </select>
                ))}
                <button style={smallBtn} onClick={() => addNoteToRow(rowIdx)}>
                  +
                </button>
                <button
                  style={smallBtn}
                  onClick={() => removeNoteFromRow(rowIdx)}
                >
                  −
                </button>
              </div>
            ))}
          </div>

          <div style={sectionStyle}>
            <span style={sectionLabel}>Cycle pattern</span>
            <div style={rowStyle}>
              {conf.impromptuInputsCycle.map((val, idx) => (
                <select
                  key={idx}
                  value={val}
                  onChange={(e) => updateCycle(idx, Number(e.target.value))}
                  style={noteSelect}
                >
                  {conf.impromptuInputs.map((_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              ))}
              <button style={smallBtn} onClick={addCycleStep}>
                +
              </button>
              <button style={smallBtn} onClick={removeCycleStep}>
                −
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const wrapper = {
  padding: "12px 16px",
  borderTop: "1px solid var(--border-subtle)",
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const title = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--title-text-color)",
};

const sectionStyle = {
  marginBottom: 10,
};

const sectionLabel = {
  fontSize: 11,
  color: "var(--section-label-color)",
  display: "block",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 4,
  flexWrap: "wrap",
};

const rowLabel = {
  fontSize: 11,
  color: "var(--row-label-color)",
  width: 16,
  textAlign: "right",
  flexShrink: 0,
};

const noteSelect = {
  padding: "3px 4px",
  border: "none",
  borderRadius: 4,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  fontSize: 12,
  cursor: "pointer",
  width: 48,
  textAlign: "center",
};

const smallBtn = {
  padding: "2px 8px",
  border: "none",
  borderRadius: 4,
  background: "var(--small-btn-bg)",
  color: "var(--small-btn-color)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: "18px",
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--label-color)",
};

const sequenceDisplay = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  marginBottom: 10,
  minHeight: 24,
};

const noteChip = {
  padding: "2px 6px",
  borderRadius: 3,
  background: "var(--note-chip-bg)",
  color: "var(--note-chip-color)",
  fontSize: 11,
  fontFamily: "monospace",
  letterSpacing: 0.5,
  display: "inline-flex",
  alignItems: "baseline",
  gap: 1,
};

const octLabel = {
  fontSize: 8,
  opacity: 0.5,
};

const noteRest = {
  ...noteChip,
  color: "var(--note-rest-color)",
};

const velToggle = {
  padding: "2px 6px",
  border: "none",
  borderRadius: 4,
  color: "var(--btn-color)",
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 600,
};

const randomizeBtn = {
  padding: "5px 14px",
  border: "none",
  borderRadius: 5,
  background: "var(--randomize-bg)",
  color: "var(--btn-color)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const selectStyle = {
  padding: "4px 6px",
  border: "none",
  borderRadius: 5,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  fontSize: 12,
  cursor: "pointer",
};
