import React, { useState, useRef } from "react";
import { trackCss } from "../trackColor.js";

const NOTE_OPTIONS = [
  "",
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

const SCALE_NOTES = ["C", "D", "E", "F", "G", "A", "As", "B"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSequence() {
  const pool = [...SCALE_NOTES, ""];
  const numRows = randInt(2, 4);
  const inputs = [];
  for (let r = 0; r < numRows; r++) {
    const len = randInt(3, 6);
    const row = [];
    for (let c = 0; c < len; c++) {
      row.push(pick(pool));
    }
    inputs.push(row);
  }
  const cycleLen = randInt(3, 6);
  const cycle = [];
  for (let i = 0; i < cycleLen; i++) {
    cycle.push(randInt(0, numRows - 1));
  }
  return { impromptuInputs: inputs, impromptuInputsCycle: cycle };
}

const SHOW_MANUAL_EDITOR = false;

function displayNote(n) {
  if (!n) return "·";
  if (n.length === 2 && n[1] === "s") return n[0] + "♯";
  if (n.length === 2 && n[1] === "b") return n[0] + "♭";
  return n;
}

function flattenSequence(inputs, cycle) {
  let result = [];
  for (const idx of cycle) {
    if (inputs[idx]) result = result.concat(inputs[idx]);
  }
  return result.map((n) => ({ raw: n, display: displayNote(n) }));
}

export default function TrackDetail({ track, emit, seqPos }) {
  const { id, conf } = track;
  const [flashing, setFlashing] = useState(false);
  const flashTimer = useRef(null);

  const patch = (update) => {
    emit("setTrackConf", { trackId: id, patch: update });
  };

  const randomize = () => {
    patch(generateSequence());
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

  const flat = flattenSequence(conf.impromptuInputs, conf.impromptuInputsCycle);

  return (
    <div style={wrapper}>
      <div style={headerRow}>
        <span style={title}>Track {id}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            style={{
              ...randomizeBtn,
              background: flashing ? "#6a6aaa" : "#3a3a6a",
              transition: "background 0.15s",
            }}
            onClick={randomize}
          >
            Randomize
          </button>
          <label style={labelStyle}>
            Octave
            <select
              value={conf.impromptuOctave}
              onChange={(e) =>
                patch({ impromptuOctave: Number(e.target.value) })
              }
              style={selectStyle}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={sequenceDisplay} translate="no">
        {flat.map(({ raw, display }, i) => {
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
  borderTop: "1px solid rgba(255,255,255,0.06)",
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
  color: "#ccc",
};

const sectionStyle = {
  marginBottom: 10,
};

const sectionLabel = {
  fontSize: 11,
  color: "#777",
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
  color: "#666",
  width: 16,
  textAlign: "right",
  flexShrink: 0,
};

const noteSelect = {
  padding: "3px 4px",
  border: "none",
  borderRadius: 4,
  background: "#2a2a4a",
  color: "#e0e0e0",
  fontSize: 12,
  cursor: "pointer",
  width: 48,
  textAlign: "center",
};

const smallBtn = {
  padding: "2px 8px",
  border: "none",
  borderRadius: 4,
  background: "#1a1a3a",
  color: "#888",
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
  color: "#aaa",
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
  background: "rgba(255,255,255,0.08)",
  color: "#ccc",
  fontSize: 11,
  fontFamily: "monospace",
  letterSpacing: 0.5,
};

const noteRest = {
  ...noteChip,
  color: "#555",
};

const randomizeBtn = {
  padding: "5px 14px",
  border: "none",
  borderRadius: 5,
  background: "#3a3a6a",
  color: "#e0e0e0",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const selectStyle = {
  padding: "4px 6px",
  border: "none",
  borderRadius: 5,
  background: "#2a2a4a",
  color: "#e0e0e0",
  fontSize: 12,
  cursor: "pointer",
};
