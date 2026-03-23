function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const RETRO_HUES = [320, 190, 270, 45, 160, 340, 220, 290, 30, 180];

let cfg = { hues: null, s: 0.7, l: 0.6 };

export function setTrackColorConfig({ hues, saturation, lightness }) {
  if (hues !== undefined) cfg.hues = hues;
  if (saturation !== undefined) cfg.s = saturation;
  if (lightness !== undefined) cfg.l = lightness;
}

export const THEME_TRACK_COLORS = {
  clean: { hues: null, saturation: 0.7, lightness: 0.6 },
  retro: { hues: RETRO_HUES, saturation: 0.85, lightness: 0.6 },
};

export function trackHue(trackId) {
  if (cfg.hues) {
    return cfg.hues[((trackId ?? 1) - 1) % cfg.hues.length];
  }
  return ((trackId ?? 1) * 137) % 360;
}

export function trackRgb(trackId, s, l) {
  return hslToRgb(trackHue(trackId) / 360, s ?? cfg.s, l ?? cfg.l);
}

export function trackCss(trackId, s, l) {
  const [r, g, b] = trackRgb(trackId, s, l);
  return `rgb(${r},${g},${b})`;
}
