import React, { useState } from "react";

export default function Controls({ ports, conf, playing, emit }) {
  const [selectedPort, setSelectedPort] = useState(0);

  const toggleStyle = (active) => ({
    ...btnBase,
    background: active ? "#e94560" : "#2a2a4a",
    color: active ? "#fff" : "#aaa",
  });

  return (
    <div style={wrapper}>
      <select
        value={selectedPort}
        onChange={(e) => setSelectedPort(Number(e.target.value))}
        style={selectStyle}
      >
        {ports.length === 0 && <option>No ports</option>}
        {ports.map((p) => (
          <option key={p.index} value={p.index}>
            {p.name}
          </option>
        ))}
      </select>

      <button
        style={btnBase}
        onClick={() => emit("connectPort", { portIndex: selectedPort })}
      >
        Connect
      </button>

      <div style={{ width: 1, height: 24, background: "#444" }} />

      <button
        style={{ ...btnBase, background: playing ? "#e94560" : "#0f3460" }}
        onClick={() => emit(playing ? "stop" : "start")}
      >
        {playing ? "Stop" : "Start"}
      </button>

      <label style={labelStyle}>
        BPM {conf.BPM}
        <input
          type="range"
          min={60}
          max={300}
          value={conf.BPM}
          onChange={(e) => emit("setConf", { BPM: Number(e.target.value) })}
          style={{ width: 80, cursor: "pointer" }}
        />
      </label>

      <div style={{ width: 1, height: 24, background: "#444" }} />

      <button
        style={toggleStyle(conf.playImpromptuOn)}
        onClick={() =>
          emit("setConf", { playImpromptuOn: !conf.playImpromptuOn })
        }
      >
        Improv
      </button>
      <button
        style={toggleStyle(conf.playBeatOn)}
        onClick={() => emit("setConf", { playBeatOn: !conf.playBeatOn })}
      >
        Beat
      </button>
      <button
        style={toggleStyle(conf.playScaleOn)}
        onClick={() => emit("setConf", { playScaleOn: !conf.playScaleOn })}
      >
        Scale
      </button>
    </div>
  );
}

const wrapper = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  background: "#1a1a2e",
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

const selectStyle = {
  padding: "6px 8px",
  border: "none",
  borderRadius: 6,
  background: "#2a2a4a",
  color: "#e0e0e0",
  fontSize: 13,
  cursor: "pointer",
  maxWidth: 160,
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "#aaa",
  whiteSpace: "nowrap",
};
