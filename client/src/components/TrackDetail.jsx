import React, { useState, useRef, useCallback, useEffect } from "react";
import { Knob } from "primereact/knob";
import { trackCss, trackRgb } from "../trackColor.js";
import { ALL_NOTES, MODES, displayNote, getScaleNotes } from "../scaleUtils.js";

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

const NOTE_OPTIONS = ["", ...ALL_NOTES];

const SHOW_MANUAL_EDITOR = false;

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
  pianoKeyRef = null,
  onListeningChange = null,
  onPreviewNote = null,
}) {
  const { id, conf } = track;
  const [flashing, setFlashing] = useState(false);
  const flashTimer = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    return () => clearTimeout(flashTimer.current);
  }, []);
  const [manualNotes, setManualNotes] = useState([]);
  const [reassignIdx, setReassignIdx] = useState(null);

  const patch = (update) => {
    emit("setTrackConf", { trackId: id, patch: update });
  };

  const randomize = () => {
    emit("randomize", { trackId: id });
    setFlashing(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashing(false), 200);
  };

  const setListeningAndNotify = (val) => {
    setListening(val);
    if (onListeningChange) onListeningChange(val);
  };

  const toggleSet = () => {
    if (listening) {
      setListeningAndNotify(false);
      setManualNotes([]);
      setReassignIdx(null);
    } else {
      const existing = flat.map((s) => ({
        note: s.raw || "",
        octave: s.octave ?? null,
      }));
      setManualNotes(existing);
      setReassignIdx(null);
      setListeningAndNotify(true);
    }
  };

  const clearManual = () => {
    setManualNotes([]);
    setReassignIdx(null);
  };

  const confirmManual = () => {
    if (manualNotes.length === 0) return;
    const notes = manualNotes.map((n) => n.note);
    const octaves = manualNotes.map((n) => n.octave);
    patch({
      impromptuInputs: [notes],
      impromptuInputsCycle: [0],
      impromptuOctaves: octaves,
      steps: notes.length,
    });
    setListeningAndNotify(false);
    setManualNotes([]);
    setReassignIdx(null);
  };

  const undoManual = () => {
    if (manualNotes.length > 0) {
      setManualNotes((prev) => prev.slice(0, -1));
    }
  };

  const addRest = () => {
    if (!listening) return;
    if (reassignIdx !== null) {
      setManualNotes((prev) => {
        const copy = [...prev];
        copy[reassignIdx] = { note: "", octave: null };
        return copy;
      });
      setReassignIdx(null);
    } else {
      setManualNotes((prev) => [...prev, { note: "", octave: null }]);
    }
  };

  const handlePianoKey = useCallback(
    ({ note, octave, midi }) => {
      if (!listening) return;
      emit("previewNote", { trackId: id, midi });
      if (onPreviewNote) onPreviewNote(midi);
      if (reassignIdx !== null) {
        setManualNotes((prev) => {
          const copy = [...prev];
          copy[reassignIdx] = { note, octave };
          return copy;
        });
        setReassignIdx(null);
      } else {
        setManualNotes((prev) => [...prev, { note, octave }]);
      }
    },
    [listening, reassignIdx, emit, id, onPreviewNote],
  );

  useEffect(() => {
    if (pianoKeyRef) {
      pianoKeyRef.current = listening ? handlePianoKey : null;
    }
    return () => {
      if (pianoKeyRef) pianoKeyRef.current = null;
    };
  }, [listening, handlePianoKey, pianoKeyRef]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              ...title,
              background: trackCss(id),
              padding: "0 8px",
              borderRadius: 4,
              color: "#fff",
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              boxSizing: "border-box",
            }}
          >
            Track {id}
          </span>
          <button
            style={{
              ...setBtn,
              background: listening
                ? "var(--toggle-active-bg)"
                : "var(--btn-bg)",
            }}
            onClick={toggleSet}
          >
            {listening ? "Back" : "Edit"}
          </button>
          {listening && (
            <>
              <button
                style={{ ...confirmBtn, background: "var(--toggle-active-bg)" }}
                onClick={confirmManual}
              >
                Confirm
              </button>
              <button style={confirmBtn} onClick={undoManual}>
                Undo
              </button>
              <button style={confirmBtn} onClick={clearManual}>
                Clear
              </button>
              <button
                style={{ ...confirmBtn, background: "var(--pause-active-bg)" }}
                onClick={addRest}
              >
                Rest
              </button>
            </>
          )}
        </div>
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
          <label style={{ ...labelStyle, gap: 4 }}>
            Rel {conf.release ?? 80}%
            <input
              type="range"
              min={10}
              max={100}
              value={conf.release ?? 80}
              onChange={(e) => patch({ release: Number(e.target.value) })}
              style={{ width: 60, cursor: "pointer" }}
            />
          </label>
          <button
            style={{
              ...randomizeBtn,
              background: flashing
                ? "var(--randomize-flash)"
                : "var(--randomize-bg)",
              transition: "background 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 0,
            }}
            onClick={randomize}
            title="Randomize track"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ verticalAlign: "middle" }}
            >
              <path d="M12 2a10 10 0 0 1 7.07 2.93l1.5-1.5A.75.75 0 0 1 22 4v5a1 1 0 0 1-1 1h-5a.75.75 0 0 1-.53-1.28l1.7-1.7A7.5 7.5 0 0 0 4.5 12H2A10 10 0 0 1 12 2z" />
              <path d="M12 22a10 10 0 0 1-7.07-2.93l-1.5 1.5A.75.75 0 0 1 2 20v-5a1 1 0 0 1 1-1h5a.75.75 0 0 1 .53 1.28l-1.7 1.7A7.5 7.5 0 0 0 19.5 12H22A10 10 0 0 1 12 22z" />
            </svg>
          </button>
        </div>
      </div>

      {conf.internalAudio && (
        <div style={adsrRow}>
          {[
            { key: "synthLpf", label: "LPF", def: 100, color: "#e06c75" },
            { key: "synthRes", label: "Res", def: 0, color: "#e5c07b" },
            { key: "synthAttack", label: "A", def: 1, color: "#5bcefa" },
            { key: "synthDecay", label: "D", def: 10, color: "#f5a623" },
            { key: "synthSustain", label: "S", def: 80, color: "#7ed957" },
            { key: "synthRelease", label: "R", def: 15, color: "#c084fc" },
          ].map(({ key, label, def, color }) => (
            <div key={key} style={adsrKnobWrap}>
              <Knob
                value={conf[key] ?? def}
                onChange={(e) => patch({ [key]: e.value })}
                size={40}
                strokeWidth={6}
                valueColor={color}
                rangeColor="rgba(255,255,255,0.1)"
                textColor="rgba(255,255,255,0.65)"
                valueTemplate={"{value}"}
              />
              <span style={adsrLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={sequenceDisplay} translate="no">
        {listening
          ? manualNotes.map(({ note, octave }, i) => {
              const isReassign = reassignIdx === i;
              const isRest = !note;
              return (
                <span
                  key={i}
                  style={{
                    ...(isRest ? noteRest : noteChip),
                    cursor: "pointer",
                    outline: isReassign ? `2px solid ${trackCss(id)}` : "none",
                    animation: isReassign
                      ? "manualBlink 0.6s infinite"
                      : "none",
                  }}
                  onClick={() => setReassignIdx(i === reassignIdx ? null : i)}
                >
                  {isRest ? "—" : displayNote(note)}
                  {!isRest && octave != null && (
                    <span style={octLabel}>{octave}</span>
                  )}
                </span>
              );
            })
          : flat.map(({ raw, display, octave }, i) => {
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
        {listening && (
          <span style={{ ...noteRest, opacity: 0.4, fontSize: 14 }}>
            {reassignIdx !== null
              ? `⟵ step ${reassignIdx + 1}`
              : "▸ click a key"}
          </span>
        )}
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
  flexWrap: "wrap",
  gap: 6,
};

const title = {
  fontSize: 11,
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

const setBtn = {
  padding: "0 8px",
  border: "none",
  borderRadius: 4,
  color: "var(--btn-color)",
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 600,
  marginLeft: 6,
  height: 22,
  boxSizing: "border-box",
};

const confirmBtn = {
  padding: "0 8px",
  border: "none",
  borderRadius: 4,
  background: "var(--btn-bg)",
  color: "var(--btn-color)",
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 600,
  marginLeft: 3,
  height: 22,
  boxSizing: "border-box",
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

const adsrRow = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "4px 0 8px",
};

const adsrKnobWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
};

const adsrLabel = {
  fontSize: 10,
  color: "rgba(255,255,255,0.6)",
  textAlign: "center",
  letterSpacing: 0.5,
};
