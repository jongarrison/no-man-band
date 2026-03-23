import React, { useState, useRef, useEffect } from "react";

export default function CliPanel({ emit, evalResults }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const histIdxRef = useRef(-1);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [evalResults]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const code = input.trim();
    if (!code) return;
    emit("eval", code);
    setHistory((prev) => {
      const filtered = prev.filter((h) => h !== code);
      return [...filtered, code];
    });
    histIdxRef.current = -1;
    setInput("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistory((prev) => {
        if (prev.length === 0) return prev;
        const idx = histIdxRef.current;
        const next = idx === -1 ? prev.length - 1 : Math.max(0, idx - 1);
        histIdxRef.current = next;
        setInput(prev[next]);
        return prev;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistory((prev) => {
        const idx = histIdxRef.current;
        if (idx === -1) return prev;
        const next = idx + 1;
        if (next >= prev.length) {
          histIdxRef.current = -1;
          setInput("");
        } else {
          histIdxRef.current = next;
          setInput(prev[next]);
        }
        return prev;
      });
    }
  };

  return (
    <div style={wrapper} onClick={() => inputRef.current?.focus()}>
      <div style={scanlineOverlay} />
      <div ref={logRef} style={logArea}>
        {evalResults.map((entry, i) => (
          <div key={i}>
            <div style={cmdLine}>
              <span style={prompt}>noManBand$ </span>
              {entry.input}
            </div>
            {entry.error ? (
              <div style={errorLine}>{entry.error}</div>
            ) : entry.output != null ? (
              <div style={resultLine}>{entry.output}</div>
            ) : null}
          </div>
        ))}
      </div>
      <div style={inputRow}>
        <span style={prompt}>noManBand$ </span>
        <div style={inputWrap}>
          <input
            ref={inputRef}
            className="crt-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            style={inputStyle}
            spellCheck={false}
            autoComplete="off"
          />
          <span style={sizerStyle}>{input}</span>
          <span className="crt-cursor" />
        </div>
      </div>
    </div>
  );
}

const NEON = "#39ff14";
const NEON_DIM = "#1a8a0a";
const TERM_BG = "rgba(0, 8, 0, 0.6)";
const FONT = "'VT323', 'Courier New', 'Lucida Console', monospace";

const wrapper = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  minHeight: 200,
  maxHeight: 340,
  cursor: "text",
  background: TERM_BG,
};

const scanlineOverlay = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 3,
  backgroundImage:
    "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
  backgroundSize: "100% 3px",
};

const logArea = {
  position: "relative",
  zIndex: 2,
  flex: 1,
  overflowY: "auto",
  padding: "8px 12px",
  fontFamily: FONT,
  fontSize: 18,
  lineHeight: "24px",
  color: NEON,
};

const inputRow = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  padding: "6px 12px 10px",
  fontFamily: FONT,
  fontSize: 18,
  borderTop: `1px solid ${NEON_DIM}`,
};

const prompt = {
  color: NEON,
  marginRight: 6,
  flexShrink: 0,
  userSelect: "none",
  textShadow: `0 0 3px ${NEON}`,
};

const inputWrap = {
  flex: 1,
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  overflow: "hidden",
};

const inputStyle = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: NEON,
  fontFamily: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  padding: 0,
  caretColor: "transparent",
  textShadow: `0 0 2px ${NEON}`,
};

const sizerStyle = {
  visibility: "hidden",
  whiteSpace: "pre",
  fontFamily: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  minWidth: 1,
};

const cmdLine = {
  color: NEON,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  textShadow: `0 0 2px ${NEON}`,
  opacity: 0.7,
};

const resultLine = {
  color: NEON,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  paddingLeft: 4,
  marginBottom: 4,
  textShadow: `0 0 2px ${NEON}`,
};

const errorLine = {
  color: "#ff3333",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  paddingLeft: 4,
  marginBottom: 4,
  textShadow: "0 0 2px #ff3333",
};
