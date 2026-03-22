import React from "react";
import { trackRgb } from "../trackColor.js";

const OCTAVE_START = 2;
const OCTAVE_END = 5;
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

function buildKeys() {
  const keys = [];
  for (let oct = OCTAVE_START; oct <= OCTAVE_END; oct++) {
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

const ALL_KEYS = buildKeys();
const WHITE_KEYS = ALL_KEYS.filter((k) => !k.isBlack);
const BLACK_KEYS = ALL_KEYS.filter((k) => k.isBlack);

const WHITE_COLOR = "#f0f0f0";
const BLACK_COLOR = "#1a1a2e";

export default function Piano({ width, height, activeNotes = [] }) {
  const whiteW = width / WHITE_KEYS.length;
  const blackW = whiteW * 0.6;
  const blackH = height * 0.6;

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

  const blackXFor = (key) => {
    let whiteIdx = 0;
    for (const k of ALL_KEYS) {
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
      {WHITE_KEYS.map((key, i) => (
        <rect
          key={key.midi}
          x={i * whiteW}
          y={0}
          width={whiteW - 1}
          height={height}
          rx={3}
          fill={colorFor(key.midi) || WHITE_COLOR}
          style={{ transition: "fill 0.08s" }}
        />
      ))}
      {BLACK_KEYS.map((key) => (
        <rect
          key={key.midi}
          x={blackXFor(key)}
          y={0}
          width={blackW}
          height={blackH}
          rx={2}
          fill={colorFor(key.midi) || BLACK_COLOR}
          style={{ transition: "fill 0.08s" }}
        />
      ))}
    </svg>
  );
}
