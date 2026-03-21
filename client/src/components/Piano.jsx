import React from "react";

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

const ACTIVE_COLOR = "#e94560";
const WHITE_COLOR = "#f0f0f0";
const WHITE_ACTIVE = ACTIVE_COLOR;
const BLACK_COLOR = "#1a1a2e";
const BLACK_ACTIVE = ACTIVE_COLOR;

export default function Piano({ width, height, activeNote }) {
  const whiteW = width / WHITE_KEYS.length;
  const blackW = whiteW * 0.6;
  const blackH = height * 0.6;

  const whiteIndexOf = (midi) => {
    let idx = 0;
    for (const k of ALL_KEYS) {
      if (k.midi === midi) return k.isBlack ? -1 : idx;
      if (!k.isBlack) idx++;
    }
    return -1;
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
      {WHITE_KEYS.map((key, i) => {
        const active = activeNote === key.midi;
        return (
          <rect
            key={key.midi}
            x={i * whiteW}
            y={0}
            width={whiteW - 1}
            height={height}
            rx={3}
            fill={active ? WHITE_ACTIVE : WHITE_COLOR}
            style={{ transition: "fill 0.08s" }}
          />
        );
      })}
      {BLACK_KEYS.map((key) => {
        const active = activeNote === key.midi;
        return (
          <rect
            key={key.midi}
            x={blackXFor(key)}
            y={0}
            width={blackW}
            height={blackH}
            rx={2}
            fill={active ? BLACK_ACTIVE : BLACK_COLOR}
            style={{ transition: "fill 0.08s" }}
          />
        );
      })}
    </svg>
  );
}
