import React, { useRef, useEffect } from "react";
import p5 from "p5";

export default function Visualizer({ width, height, onNoteRef }) {
  const containerRef = useRef(null);
  const sketchRef = useRef(null);

  useEffect(() => {
    const ripples = [];

    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(width, height);
        p.noStroke();
      };

      p.draw = () => {
        p.background(22, 33, 62, 40);

        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i];
          r.radius += 2;
          r.alpha -= 3;
          if (r.alpha <= 0) {
            ripples.splice(i, 1);
            continue;
          }
          p.fill(r.color[0], r.color[1], r.color[2], r.alpha);
          p.ellipse(r.x, r.y, r.radius * 2, r.radius * 2);
        }
      };
    };

    sketchRef.current = new p5(sketch, containerRef.current);

    onNoteRef.current = (data) => {
      const hue = (data.note * 15) % 360;
      const rgb = hslToRgb(hue / 360, 0.7, 0.6);
      ripples.push({
        x: width / 2 + (Math.random() - 0.5) * width * 0.4,
        y: height / 2 + (Math.random() - 0.5) * height * 0.3,
        radius: 5,
        alpha: 200,
        color: rgb,
      });
    };

    return () => {
      sketchRef.current?.remove();
    };
  }, [width, height, onNoteRef]);

  return <div ref={containerRef} style={{ flexShrink: 0 }} />;
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

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
