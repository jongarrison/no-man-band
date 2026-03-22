import React, { useMemo } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { trackRgb } from "../trackColor.js";

const PIANO_COLORS = {
  clean: { white: "#f0f0f0", black: "#1a1a2e" },
  retro: { white: "#e0d0f0", black: "#0a0518" },
};

const NOTE_NAMES = [
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
const BLACK_INDICES = new Set([1, 3, 6, 8, 10]);

function buildKeys(octStart, octEnd) {
  const keys = [];
  for (let oct = octStart; oct <= octEnd; oct++) {
    for (let i = 0; i < 12; i++) {
      keys.push({
        name: NOTE_NAMES[i],
        octave: oct,
        midi: 24 + i + oct * 12,
        isBlack: BLACK_INDICES.has(i),
      });
    }
  }
  return keys;
}

export default function Piano({
  width,
  height,
  activeNotes = [],
  octaveStart = 2,
  octaveEnd = 5,
  listening = false,
  scaleHighlight = null,
  highlightColor = null,
  onKeyClick = null,
}) {
  const theme = useTheme();
  const { white: WHITE_COLOR, black: BLACK_COLOR } =
    PIANO_COLORS[theme] || PIANO_COLORS.clean;
  const allKeys = useMemo(
    () => buildKeys(octaveStart, octaveEnd),
    [octaveStart, octaveEnd],
  );
  const whiteKeys = useMemo(() => allKeys.filter((k) => !k.isBlack), [allKeys]);
  const blackKeys = useMemo(() => allKeys.filter((k) => k.isBlack), [allKeys]);

  const whiteW = width / whiteKeys.length;
  const blackW = whiteW * 0.6;
  const blackH = height * 0.6;

  const scaleSet = useMemo(
    () => (scaleHighlight ? new Set(scaleHighlight) : null),
    [scaleHighlight],
  );

  const activeMap = new Map();
  for (const n of activeNotes) {
    if (!activeMap.has(n.note)) activeMap.set(n.note, []);
    const ids = activeMap.get(n.note);
    if (!ids.includes(n.trackId)) ids.push(n.trackId);
  }

  const colorFor = (midi) => {
    const ids = activeMap.get(midi);
    if (!ids) return null;
    if (ids.length === 1) {
      const [r, g, b] = trackRgb(ids[0]);
      return `rgb(${r},${g},${b})`;
    }
    let rr = 0,
      gg = 0,
      bb = 0;
    for (const id of ids) {
      const [r, g, b] = trackRgb(id);
      rr += r;
      gg += g;
      bb += b;
    }
    const len = ids.length;
    return `rgb(${Math.round(rr / len)},${Math.round(gg / len)},${Math.round(bb / len)})`;
  };

  const isInScale = (key) => listening && scaleSet && scaleSet.has(key.name);

  const scaleFill = (key, isBlack) => {
    if (!isInScale(key) || !highlightColor) return null;
    const [r, g, b] = highlightColor;
    return isBlack
      ? `rgb(${Math.round(r * 0.4)},${Math.round(g * 0.4)},${Math.round(b * 0.4)})`
      : `rgb(${r},${g},${b})`;
  };

  const handleClick = (key) => {
    if (listening && onKeyClick && isInScale(key)) {
      onKeyClick({ note: key.name, octave: key.octave, midi: key.midi });
    }
  };

  const blackXFor = (key) => {
    let whiteIdx = 0;
    for (const k of allKeys) {
      if (k.midi === key.midi) break;
      if (!k.isBlack) whiteIdx++;
    }
    return whiteIdx * whiteW - blackW / 2;
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      {whiteKeys.map((key, i) => (
        <rect
          key={key.midi}
          x={i * whiteW}
          y={0}
          width={whiteW - 1}
          height={height}
          rx={3}
          fill={colorFor(key.midi) || scaleFill(key, false) || WHITE_COLOR}
          style={{
            transition: "fill 0.08s",
            cursor: isInScale(key) ? "pointer" : "default",
          }}
          onClick={() => handleClick(key)}
        />
      ))}
      {blackKeys.map((key) => (
        <rect
          key={key.midi}
          x={blackXFor(key)}
          y={0}
          width={blackW}
          height={blackH}
          rx={2}
          fill={colorFor(key.midi) || scaleFill(key, true) || BLACK_COLOR}
          style={{
            transition: "fill 0.08s",
            cursor: isInScale(key) ? "pointer" : "default",
          }}
          onClick={() => handleClick(key)}
        />
      ))}
    </svg>
  );
}
