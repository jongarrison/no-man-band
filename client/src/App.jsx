import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import GlobalControls from "./components/GlobalControls.jsx";
import TrackControls from "./components/TrackControls.jsx";
import TrackDetail from "./components/TrackDetail.jsx";
import Piano from "./components/Piano.jsx";
import Visualizer from "./components/Visualizer.jsx";

const CONTAINER_WIDTH = 860;

export default function App() {
  const socketRef = useRef(null);
  const [ports, setPorts] = useState([]);
  const [state, setState] = useState(null);
  const [activeNotes, setActiveNotes] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [seqPositions, setSeqPositions] = useState({});
  const activeTimers = useRef({});
  const visualizerNoteRef = useRef(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("ports", setPorts);
    socket.on("state", (s) => {
      setState(s);
      if (!s.playing) {
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

    return () => socket.disconnect();
  }, []);

  const emit = useCallback(
    (event, data) => socketRef.current?.emit(event, data),
    [],
  );

  const selectedTrack = state?.tracks.find((t) => t.id === selectedTrackId);

  return (
    <>
      <Visualizer onNoteRef={visualizerNoteRef} />

      <div style={pageWrapper}>
        {!state ? (
          <div style={cardStyle}>
            <p style={{ textAlign: "center", padding: 40 }}>Connecting...</p>
          </div>
        ) : (
          <div style={cardStyle}>
            <GlobalControls
              BPM={state.BPM}
              playing={state.playing}
              emit={emit}
            />
            <div style={trackListStyle}>
              {state.tracks.map((track) => (
                <TrackControls
                  key={track.id}
                  track={track}
                  ports={ports}
                  emit={emit}
                  selected={track.id === selectedTrackId}
                  onSelect={() => setSelectedTrackId(track.id)}
                />
              ))}
            </div>
            {selectedTrack && (
              <TrackDetail
                track={selectedTrack}
                emit={emit}
                seqPos={seqPositions[selectedTrack.id]}
              />
            )}
            <Piano
              width={CONTAINER_WIDTH}
              height={100}
              activeNotes={activeNotes}
            />
          </div>
        )}
      </div>
    </>
  );
}

const pageWrapper = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  padding: 20,
};

const cardStyle = {
  width: CONTAINER_WIDTH,
  background: "rgba(22, 33, 62, 0.92)",
  borderRadius: 12,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  backdropFilter: "blur(8px)",
};

const trackListStyle = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
