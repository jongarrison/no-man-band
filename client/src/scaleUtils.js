export const ALL_NOTES = [
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

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  "harm minor": [0, 2, 3, 5, 7, 8, 11],
  "mel minor": [0, 2, 3, 5, 7, 9, 11],
  "maj pent": [0, 2, 4, 7, 9],
  "min pent": [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export function getScaleNotes(key, mode) {
  const root = ALL_NOTES.indexOf(key);
  const intervals = SCALES[mode] || SCALES.major;
  return intervals.map((i) => ALL_NOTES[(root + i) % 12]);
}
