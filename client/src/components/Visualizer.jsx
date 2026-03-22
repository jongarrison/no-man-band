import React, { useRef, useEffect } from "react";
import p5 from "p5";
import { trackRgb } from "../trackColor.js";

export default function Visualizer({ onNoteRef }) {
  const containerRef = useRef(null);
  const sketchRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ripples = [];

    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(window.innerWidth, window.innerHeight);
        p.background(22, 33, 62);
        p.noStroke();
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        p.background(22, 33, 62);
      };

      p.draw = () => {
        p.background(22, 33, 62, 30);

        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i];
          r.radius += 1.5;
          r.alpha -= 2;
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
      const w = window.innerWidth;
      const h = window.innerHeight;
      const noteShift = ((data.note * 5) % 40) - 20;
      const rgb = trackRgb(data.trackId, 0.7, 0.6);
      rgb[0] = Math.round(
        Math.min(255, Math.max(0, rgb[0] + (noteShift / 20) * 30)),
      );
      rgb[1] = Math.round(
        Math.min(255, Math.max(0, rgb[1] + (noteShift / 20) * 15)),
      );
      ripples.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 8,
        alpha: 180,
        color: rgb,
      });
    };

    return () => {
      sketchRef.current?.remove();
    };
  }, [onNoteRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
      }}
    />
  );
}
