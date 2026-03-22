import React from "react";

export default function GlobalControls({ BPM, playing, emit }) {
  return (
    <div style={wrapper}>
      <button
        style={{ ...btnBase, background: playing ? "#e94560" : "#0f3460" }}
        onClick={() => emit(playing ? "stop" : "start")}
      >
        {playing ? "Stop" : "Start"}
      </button>

      <label style={labelStyle}>
        BPM {BPM}
        <input
          type="range"
          min={60}
          max={300}
          value={BPM}
          onChange={(e) => emit("setConf", { BPM: Number(e.target.value) })}
          style={{ width: 100, cursor: "pointer" }}
        />
      </label>

      <div style={{ flex: 1 }} />

      <button style={btnBase} onClick={() => emit("addTrack")}>
        + Track
      </button>
    </div>
  );
}

const wrapper = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 16px",
  flexShrink: 0,
};

const btnBase = {
  padding: "6px 12px",
  border: "none",
  borderRadius: 6,
  background: "#0f3460",
  color: "#e0e0e0",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "#aaa",
  whiteSpace: "nowrap",
};
