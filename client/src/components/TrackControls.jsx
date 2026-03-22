import React, { useState, useEffect } from "react";
import { trackCss } from "../trackColor.js";

export default function TrackControls({
  track,
  ports,
  emit,
  selected,
  onSelect,
}) {
  const { id, conf, connected, connectedPort } = track;
  const [selectedPort, setSelectedPort] = useState(
    connectedPort != null ? connectedPort : 0,
  );
  const color = trackCss(id);

  useEffect(() => {
    if (connectedPort != null) setSelectedPort(connectedPort);
  }, [connectedPort]);

  const toggleStyle = (active) => ({
    ...btnBase,
    background: active ? "#e94560" : "#2a2a4a",
    color: active ? "#fff" : "#aaa",
  });

  return (
    <div
      style={{
        ...wrapper,
        background: selected ? "rgba(15, 52, 96, 0.4)" : "transparent",
        borderLeft: selected ? `3px solid ${color}` : "3px solid transparent",
      }}
      onClick={onSelect}
    >
      <span style={{ ...trackLabel, background: color, color: "#fff" }}>
        T{id}
      </span>

      <select
        value={selectedPort}
        onChange={(e) => {
          const port = Number(e.target.value);
          setSelectedPort(port);
          if (connected) {
            emit("connectPort", { trackId: id, portIndex: port });
          }
        }}
        onClick={(e) => e.stopPropagation()}
        style={selectStyle}
      >
        {ports.length === 0 && <option>No ports</option>}
        {ports.map((p) => (
          <option key={p.index} value={p.index}>
            {p.name}
          </option>
        ))}
      </select>

      <span style={dotStyle(connected)} />
      <button
        style={btnBase}
        onClick={(e) => {
          e.stopPropagation();
          if (connected) {
            emit("disconnectPort", { trackId: id });
          } else {
            emit("connectPort", { trackId: id, portIndex: selectedPort });
          }
        }}
      >
        {connected ? "Disconnect" : "Connect"}
      </button>

      <label style={labelStyle} onClick={(e) => e.stopPropagation()}>
        Ch
        <select
          value={conf.midiChannel}
          onChange={(e) =>
            emit("setTrackConf", {
              trackId: id,
              patch: { midiChannel: Number(e.target.value) },
            })
          }
          style={{ ...selectStyle, maxWidth: 52, padding: "4px 6px" }}
        >
          {Array.from({ length: 16 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>

      <div style={{ width: 1, height: 20, background: "#333" }} />

      <button
        style={toggleStyle(conf.playImpromptuOn)}
        onClick={(e) => {
          e.stopPropagation();
          emit("setTrackConf", {
            trackId: id,
            patch: { playImpromptuOn: !conf.playImpromptuOn },
          });
        }}
      >
        I
      </button>
      <button
        style={toggleStyle(conf.playBeatOn)}
        onClick={(e) => {
          e.stopPropagation();
          emit("setTrackConf", {
            trackId: id,
            patch: { playBeatOn: !conf.playBeatOn },
          });
        }}
      >
        B
      </button>
      <button
        style={toggleStyle(conf.playScaleOn)}
        onClick={(e) => {
          e.stopPropagation();
          emit("setTrackConf", {
            trackId: id,
            patch: { playScaleOn: !conf.playScaleOn },
          });
        }}
      >
        S
      </button>

      <div style={{ flex: 1 }} />

      <button
        style={{ ...btnBase, background: "#3a1a1a", fontSize: 11 }}
        onClick={(e) => {
          e.stopPropagation();
          emit("removeTrack", { trackId: id });
        }}
      >
        X
      </button>
    </div>
  );
}

const wrapper = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 16px",
  flexShrink: 0,
  cursor: "pointer",
  transition: "background 0.1s",
};

const trackLabel = {
  fontSize: 10,
  fontWeight: 700,
  width: 24,
  height: 20,
  borderRadius: 4,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const btnBase = {
  padding: "4px 10px",
  border: "none",
  borderRadius: 5,
  background: "#0f3460",
  color: "#e0e0e0",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const selectStyle = {
  padding: "4px 6px",
  border: "none",
  borderRadius: 5,
  background: "#2a2a4a",
  color: "#e0e0e0",
  fontSize: 12,
  cursor: "pointer",
  maxWidth: 140,
};

const dotStyle = (connected) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: connected ? "#4ecca3" : "#e94560",
  flexShrink: 0,
});

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  color: "#aaa",
  whiteSpace: "nowrap",
};
