import React, { useRef, useEffect } from "react";
import p5 from "p5";
import { trackRgb } from "../trackColor.js";

export default function GenerativeVisualizer({ tracks, onNoteRef, theme }) {
  const containerRef = useRef(null);
  const sketchRef = useRef(null);
  const tracksRef = useRef(tracks);
  const themeRef = useRef(theme);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current) return;

    const pulseStates = {};
    const drifters = [];
    const MAX_DRIFTERS = 30;

    const noteHitQueue = {};

    function ensurePulse(trackId) {
      if (pulseStates[trackId]) return pulseStates[trackId];
      const rgb = trackRgb(trackId, 0.85, 0.6);
      pulseStates[trackId] = {
        rgb,
        phase: Math.random() * Math.PI * 2,
        freq: 0.8 + Math.random() * 0.4,
        yOffset: 0,
        energy: 0,
      };
      return pulseStates[trackId];
    }

    let waveGfx = null;

    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(window.innerWidth, window.innerHeight);
        waveGfx = p.createGraphics(p.width, p.height);
        waveGfx.colorMode(p.RGB, 255, 255, 255, 255);
        p.colorMode(p.RGB, 255, 255, 255, 255);
        const isRetro = themeRef.current === "retro";
        if (!isRetro) p.background(22, 33, 62);
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
        waveGfx.resizeCanvas(p.width, p.height);
      };

      p.draw = () => {
        const isRetro = themeRef.current === "retro";
        if (isRetro) {
          p.clear();
        } else {
          p.background(22, 33, 62, 25);
        }

        const trks = tracksRef.current || [];
        const count = trks.length || 1;
        const bandH = p.height / count;

        let globalEnergy = 0;
        for (const tid in noteHitQueue) {
          const ps = pulseStates[tid];
          if (ps && noteHitQueue[tid]) {
            ps.energy = Math.min(1, ps.energy + 0.5);
            const rgb = ps.rgb;
            const num = 4 + Math.floor(Math.random() * 4);
            let assigned = 0;
            const shuffled = [...drifters].sort(() => Math.random() - 0.5);
            for (const d of shuffled) {
              if (assigned >= num) break;
              d.targetColor = [rgb[0], rgb[1], rgb[2]];
              d.speed = 0.5 + Math.random() * 0.6;
              assigned++;
            }
          }
          delete noteHitQueue[tid];
        }

        for (const tid in pulseStates) {
          globalEnergy = Math.max(globalEnergy, pulseStates[tid].energy);
        }

        for (const d of drifters) {
          const angle =
            p.noise(
              d.x * 0.003,
              d.y * 0.003,
              d.noiseOff + p.frameCount * 0.003,
            ) *
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
          const glow = 50 + globalEnergy * 100;
          p.noStroke();
          p.fill(d.color[0], d.color[1], d.color[2], glow);
          p.ellipse(d.x, d.y, d.size, d.size);
          if (globalEnergy > 0.1) {
            p.fill(d.color[0], d.color[1], d.color[2], glow * 0.15);
            p.ellipse(d.x, d.y, d.size * 3, d.size * 3);
          }
        }
        p.noStroke();

        waveGfx.clear();
        for (let i = 0; i < trks.length; i++) {
          const t = trks[i];
          const ps = ensurePulse(t.id);
          const centerY = bandH * i + bandH / 2;
          ps.yOffset = centerY;

          ps.energy *= 0.94;
          if (ps.energy < 0.005) ps.energy = 0;

          const idleAmp = 5;
          const amp = idleAmp + ps.energy * bandH * 0.65;
          const [r, g, b] = ps.rgb;
          const baseAlpha = 50 + ps.energy * 205;

          waveGfx.noFill();
          waveGfx.strokeWeight(2 + ps.energy * 5);
          waveGfx.stroke(r, g, b, baseAlpha);
          waveGfx.beginShape();
          for (let x = 0; x <= p.width; x += 4) {
            const nx = x / p.width;
            const envelope = Math.sin(nx * Math.PI);
            const wave =
              Math.sin(
                nx * Math.PI * 6 * ps.freq + ps.phase + p.frameCount * 0.04,
              ) *
              amp *
              envelope;
            waveGfx.vertex(x, centerY + wave);
          }
          waveGfx.endShape();

          if (ps.energy > 0.05) {
            waveGfx.strokeWeight(10 + ps.energy * 10);
            waveGfx.stroke(r, g, b, ps.energy * 60);
            waveGfx.beginShape();
            for (let x = 0; x <= p.width; x += 8) {
              const nx = x / p.width;
              const envelope = Math.sin(nx * Math.PI);
              const wave =
                Math.sin(
                  nx * Math.PI * 6 * ps.freq + ps.phase + p.frameCount * 0.04,
                ) *
                amp *
                envelope;
              waveGfx.vertex(x, centerY + wave);
            }
            waveGfx.endShape();

            waveGfx.strokeWeight(1.5);
            waveGfx.stroke(r, g, b, ps.energy * 120);
            waveGfx.beginShape();
            for (let x = 0; x <= p.width; x += 4) {
              const nx = x / p.width;
              const envelope = Math.sin(nx * Math.PI);
              const wave =
                Math.sin(
                  nx * Math.PI * 12 * ps.freq +
                    ps.phase * 2 +
                    p.frameCount * 0.06,
                ) *
                amp *
                0.3 *
                envelope;
              waveGfx.vertex(x, centerY + wave);
            }
            waveGfx.endShape();
          }

          ps.phase += 0.005 + ps.energy * 0.03;
        }
        p.image(waveGfx, 0, 0);
      };
    };

    sketchRef.current = new p5(sketch, containerRef.current);

    if (onNoteRef) {
      onNoteRef.current = (data) => {
        noteHitQueue[data.trackId] = true;
        ensurePulse(data.trackId);
      };
    }

    return () => {
      sketchRef.current?.remove();
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
        zIndex: 2,
        pointerEvents: "none",
      }}
    />
  );
}
