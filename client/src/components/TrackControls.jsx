import React, { useState, useEffect } from "react";
import { trackCss } from "../trackColor.js";

export default function TrackControls({
  track,
  ports,
  emit,
  selected,
  onSelect,
  seqPos,
}) {
  const { id, conf, connected, connectedPort, trackPlaying, trackPaused } =
    track;
  const [selectedPort, setSelectedPort] = useState(
    connectedPort != null ? connectedPort : 0,
  );
  const color = trackCss(id);

  useEffect(() => {
    if (connectedPort != null) setSelectedPort(connectedPort);
  }, [connectedPort]);

  const toggleStyle = (active) => ({
    ...btnBase,
    background: active ? "var(--mode-active-bg)" : "var(--mode-inactive-bg)",
    color: active ? "var(--mode-active-color)" : "var(--mode-inactive-color)",
  });

  const flatSeq = [];
  if (conf.impromptuInputs && conf.impromptuInputsCycle) {
    for (const idx of conf.impromptuInputsCycle) {
      const row = conf.impromptuInputs[idx];
      if (row) flatSeq.push(...row);
    }
  }

  return (
    <div
      style={{
        background: selected ? "var(--selected-bg)" : "transparent",
        borderLeft: selected ? `3px solid ${color}` : "3px solid transparent",
        opacity: conf.active ? 1 : 0.45,
        cursor: "pointer",
        transition: "background 0.1s",
      }}
      onClick={onSelect}
    >
      <div style={wrapper}>
        <span
          style={{
            ...trackLabel,
            background: conf.active ? color : "#444",
            color: "#fff",
            opacity: conf.active ? 1 : 0.5,
          }}
          onClick={(e) => {
            e.stopPropagation();
            emit("setTrackConf", {
              trackId: id,
              patch: { active: !conf.active },
            });
          }}
          title={conf.active ? "Mute track" : "Unmute track"}
        >
          T{id}
        </span>

        <div
          style={{ display: "flex", gap: 2, alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              ...transportBtn,
              color: trackPlaying
                ? "var(--transport-active-color)"
                : "var(--transport-color)",
              opacity: trackPlaying ? 1 : 0.5,
            }}
            onClick={() => emit("startTrack", { trackId: id })}
            title="Play track"
          >
            ▶
          </button>
          <button
            style={{
              ...transportBtn,
              color: "var(--transport-color)",
              opacity: trackPlaying ? 1 : 0.4,
            }}
            onClick={() => emit("pauseTrack", { trackId: id })}
            title="Pause track"
          >
            ⏸
          </button>
          <button
            style={transportBtn}
            onClick={() => emit("stopTrack", { trackId: id })}
            title="Stop & reset track"
          >
            ⏹
          </button>
        </div>

        <div
          style={intExtToggle}
          onClick={(e) => {
            e.stopPropagation();
            const goingInt = !conf.internalAudio;
            const patch = { internalAudio: goingInt };
            emit("setTrackConf", { trackId: id, patch });
            if (goingInt && connected) {
              emit("disconnectPort", { trackId: id });
            }
          }}
        >
          <span style={intExtBtn(!conf.internalAudio)}>Ext</span>
          <span style={intExtBtn(conf.internalAudio)}>Int</span>
        </div>

        {!conf.internalAudio && (
          <>
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

            <span
              style={dotToggle(connected)}
              onClick={(e) => {
                e.stopPropagation();
                if (connected) {
                  emit("disconnectPort", { trackId: id });
                } else {
                  emit("connectPort", {
                    trackId: id,
                    portIndex: selectedPort,
                  });
                }
              }}
              title={connected ? "Disconnect" : "Connect"}
            />

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
          </>
        )}

        <div style={{ width: 1, height: 20, background: "var(--divider)" }} />

        <div
          style={{ display: "flex", gap: 2, alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            style={{ opacity: 0.5, marginRight: 4 }}
          >
            <circle cx="50" cy="50" r="42" />
            <line x1="50" y1="50" x2="50" y2="20" strokeLinecap="round" />
            <line x1="50" y1="50" x2="70" y2="50" strokeLinecap="round" />
          </svg>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.15)",
                background:
                  n <= (conf.timeDivision || 4)
                    ? color
                    : "var(--time-div-inactive)",
                opacity: n <= (conf.timeDivision || 4) ? 1 : 0.35,
                cursor: "pointer",
                transition: "background 0.1s, opacity 0.1s",
              }}
              onClick={() =>
                emit("setTrackConf", {
                  trackId: id,
                  patch: { timeDivision: n },
                })
              }
              title={`${n}/4 speed`}
            />
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: "var(--divider)" }} />

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
        {/* Beat toggle hidden for now */}
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
          style={{ ...btnBase, background: "var(--remove-bg)", fontSize: 11 }}
          onClick={(e) => {
            e.stopPropagation();
            emit("removeTrack", { trackId: id });
          }}
        >
          X
        </button>
      </div>

      {flatSeq.length > 0 && (
        <div style={stepGridRow}>
          {flatSeq.map((note, i) => {
            const isActive = seqPos != null && i === seqPos;
            const isRest = !note;
            return (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 1,
                  background: isActive
                    ? color
                    : isRest
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(255,255,255,0.15)",
                  transition: "background 0.08s",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const wrapper = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 16px",
  flexShrink: 0,
};

const stepGridRow = {
  display: "flex",
  gap: 2,
  padding: "0 16px 6px 45px",
  flexWrap: "wrap",
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

const transportBtn = {
  padding: "2px 4px",
  border: "none",
  borderRadius: 3,
  background: "transparent",
  color: "var(--transport-color)",
  cursor: "pointer",
  fontSize: 10,
  lineHeight: 1,
};

const btnBase = {
  padding: "4px 10px",
  border: "none",
  borderRadius: 5,
  background: "var(--btn-bg)",
  color: "var(--btn-color)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const selectStyle = {
  padding: "4px 6px",
  border: "none",
  borderRadius: 5,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  fontSize: 12,
  cursor: "pointer",
  maxWidth: 140,
};

const dotToggle = (connected) => ({
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: connected ? "var(--dot-connected)" : "var(--dot-disconnected)",
  flexShrink: 0,
  cursor: "pointer",
  transition: "background 0.1s",
  boxShadow: connected
    ? "var(--dot-connected-shadow)"
    : "var(--dot-disconnected-shadow)",
});

const intExtToggle = {
  display: "inline-flex",
  borderRadius: 5,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.15)",
  flexShrink: 0,
  cursor: "pointer",
};

const intExtBtn = (active) => ({
  padding: "2px 7px",
  fontSize: 9,
  fontWeight: 600,
  color: active ? "#fff" : "rgba(255,255,255,0.4)",
  background: active ? "var(--toggle-active-bg)" : "transparent",
  transition: "background 0.1s, color 0.1s",
  letterSpacing: 0.3,
});

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  color: "var(--label-color)",
  whiteSpace: "nowrap",
};
