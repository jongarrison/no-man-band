import React, { useRef, useEffect } from "react";
import p5 from "p5";
import { trackRgb } from "../trackColor.js";

const VIZ_BG = {
  clean: [22, 33, 62],
  retro: null,
};

export default function Visualizer({
  onNoteRef,
  theme = "clean",
  octaveStart = 2,
  octaveEnd = 5,
  pianoWidth = 860,
}) {
  const containerRef = useRef(null);
  const sketchRef = useRef(null);
  const themeRef = useRef(theme);
  const octaveStartRef = useRef(octaveStart);
  const octaveEndRef = useRef(octaveEnd);
  const pianoWidthRef = useRef(pianoWidth);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    octaveStartRef.current = octaveStart;
    octaveEndRef.current = octaveEnd;
    pianoWidthRef.current = pianoWidth;
  }, [octaveStart, octaveEnd, pianoWidth]);

  useEffect(() => {
    if (!containerRef.current) return;

    const ripples = [];
    const drifters = [];
    const bars = [];
    let energy = 0;

    const MAX_DRIFTERS = 80;

    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(window.innerWidth, window.innerHeight);
        const bg = VIZ_BG[themeRef.current];
        if (bg) p.background(...bg);
        else p.clear();
        p.colorMode(p.RGB, 255, 255, 255, 255);

        for (let i = 0; i < MAX_DRIFTERS; i++) {
          drifters.push({
            x: Math.random() * p.width,
            y: Math.random() * p.height,
            size: 1.5 + Math.random() * 2,
            speed: 0.3 + Math.random() * 0.5,
            noiseOff: Math.random() * 1000,
            color: [80, 100, 140],
            targetColor: [80, 100, 140],
          });
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        const bg = VIZ_BG[themeRef.current];
        if (bg) p.background(...bg);
        else p.clear();
      };

      p.draw = () => {
        const bg = VIZ_BG[themeRef.current];
        if (bg) p.background(...bg, 25);
        else p.clear();
        energy *= 0.96;

        drawDrifters(p);
        drawBars(p);
        drawRipples(p);
        drawWaves(p);
      };
    };

    function drawDrifters(p) {
      for (const d of drifters) {
        const angle =
          p.noise(d.x * 0.003, d.y * 0.003, d.noiseOff + p.frameCount * 0.003) *
          p.TWO_PI *
          2;
        d.x += Math.cos(angle) * d.speed;
        d.y += Math.sin(angle) * d.speed;
        if (d.x < 0) d.x = p.width;
        if (d.x > p.width) d.x = 0;
        if (d.y < 0) d.y = p.height;
        if (d.y > p.height) d.y = 0;

        d.color[0] += (d.targetColor[0] - d.color[0]) * 0.03;
        d.color[1] += (d.targetColor[1] - d.color[1]) * 0.03;
        d.color[2] += (d.targetColor[2] - d.color[2]) * 0.03;

        const glow = 60 + energy * 0.8;
        p.noStroke();
        p.fill(d.color[0], d.color[1], d.color[2], glow);
        p.ellipse(d.x, d.y, d.size, d.size);
        if (energy > 10) {
          p.fill(d.color[0], d.color[1], d.color[2], glow * 0.2);
          p.ellipse(d.x, d.y, d.size * 3, d.size * 3);
        }
      }
    }

    function drawBars(p) {
      for (let i = bars.length - 1; i >= 0; i--) {
        const b = bars[i];
        b.alpha -= 4;
        if (b.alpha <= 0) {
          bars.splice(i, 1);
          continue;
        }
        const grad = p.drawingContext;
        const grd = grad.createLinearGradient(b.x, 0, b.x, p.height);
        const a = b.alpha / 255;
        grd.addColorStop(
          0,
          `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0)`,
        );
        grd.addColorStop(
          0.4,
          `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${a * 0.15})`,
        );
        grd.addColorStop(
          0.5,
          `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${a * 0.3})`,
        );
        grd.addColorStop(
          0.6,
          `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${a * 0.15})`,
        );
        grd.addColorStop(
          1,
          `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0)`,
        );
        grad.fillStyle = grd;
        grad.fillRect(b.x - b.width / 2, 0, b.width, p.height);
      }
    }

    function drawRipples(p) {
      p.noFill();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 2;
        r.alpha -= 2.5;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        p.strokeWeight(2);
        p.stroke(r.color[0], r.color[1], r.color[2], r.alpha);
        p.ellipse(r.x, r.y, r.radius * 2, r.radius * 2);
        if (r.alpha > 40) {
          p.strokeWeight(0.5);
          p.stroke(r.color[0], r.color[1], r.color[2], r.alpha * 0.4);
          p.ellipse(r.x, r.y, r.radius * 2.6, r.radius * 2.6);
        }
      }
      p.noStroke();
    }

    function drawWaves(p) {
      const amp = 15 + energy * 2.5;
      p.noFill();
      for (let w = 0; w < 3; w++) {
        const yBase = p.height * (0.3 + w * 0.2);
        const alpha = 25 + energy * 1.5;
        const weight = 1 + energy * 0.04;
        p.strokeWeight(weight);
        p.stroke(100 + w * 30, 130 + w * 20, 180, Math.min(alpha, 200));
        p.beginShape();
        const speed = 0.008 + energy * 0.0003;
        for (let x = 0; x <= p.width; x += 8) {
          const n = p.noise(x * 0.004 + w * 10, p.frameCount * speed + w * 5);
          const y = yBase + (n - 0.5) * amp * 2;
          p.vertex(x, y);
        }
        p.endShape();
      }
      p.noStroke();
    }

    const BLACK_SET = new Set([1, 3, 6, 8, 10]);
    function noteToX(note) {
      const pw = pianoWidthRef.current;
      const cardLeft = (window.innerWidth - pw) / 2;
      const midiMin = 24 + octaveStartRef.current * 12;
      const midiMax = 24 + (octaveEndRef.current + 1) * 12 - 1;
      let totalWhite = 0;
      for (let m = midiMin; m <= midiMax; m++) {
        if (!BLACK_SET.has((m - 24) % 12)) totalWhite++;
      }
      const whiteW = pw / totalWhite;
      let whiteIdx = 0;
      for (let m = midiMin; m < note; m++) {
        if (!BLACK_SET.has((m - 24) % 12)) whiteIdx++;
      }
      const isBlack = BLACK_SET.has((note - 24) % 12);
      const localX = isBlack
        ? whiteIdx * whiteW
        : whiteIdx * whiteW + whiteW / 2;
      return cardLeft + localX;
    }

    sketchRef.current = new p5(sketch, containerRef.current);

    onNoteRef.current = (data) => {
      const h = window.innerHeight;
      const rgb = trackRgb(data.trackId, 0.85, 0.65);
      const noteX = noteToX(data.note);

      energy = Math.min(100, energy + 8);

      const count = 6 + Math.floor(Math.random() * 4);
      let assigned = 0;
      const shuffled = [...drifters].sort(() => Math.random() - 0.5);
      for (const d of shuffled) {
        if (assigned >= count) break;
        d.targetColor = [rgb[0], rgb[1], rgb[2]];
        d.speed = 0.5 + Math.random() * 0.6;
        assigned++;
      }

      ripples.push({
        x: noteX + (Math.random() - 0.5) * 80,
        y: h * (0.3 + Math.random() * 0.4),
        radius: 10,
        alpha: 200,
        color: [...rgb],
      });

      bars.push({
        x: noteX,
        width: 20 + Math.random() * 15,
        alpha: 200,
        color: [...rgb],
      });
    };

    return () => {
      sketchRef.current?.remove();
      sketchRef.current = null;
      if (onNoteRef) onNoteRef.current = null;
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
