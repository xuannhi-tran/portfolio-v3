"use client";

import { useEffect, useRef, useState } from "react";
import { useDemo } from "./useDemo";

/*
 * FIG: YouTube Dubber. Two tabs:
 *  - "Web page": a replay of the tool's local web page (127.0.0.1:8765), in English. Press "Make video" and the five
 *    progress segments light up stage by stage while the log fills in. Log lines follow dub.py's real output, trimmed.
 *  - "Pipeline": the five stages and what runs on the computer vs. what goes to an LLM (text only).
 * Only real numbers: 37 min 50 s is one real full run; the rest are settings from the repo's README.
 */

/* ---------- web page replay ---------- */

const STEPS = ["Download", "Translate", "Voice", "Assemble", "Export"]; // the real page shows these in Vietnamese
const STEPS_EN = ["download", "transcribe + translate", "speech", "assemble", "mux"];
const URL = "https://www.youtube.com/watch?v=VIDEO_ID";

type Line = { stage: number; text: string };

function script(speaker: string, subs: boolean): Line[] {
  const heard = speaker === "female" ? "female (chosen)" : speaker === "male" ? "male (chosen)" : "as heard";
  return [
    { stage: 1, text: "Video VIDEO_ID\nJob folder: dub_jobs_output/VIDEO_ID" },
    { stage: 1, text: "[1/5] download: download the video and extract its audio\n>>> yt-dlp" },
    { stage: 1, text: ">>> ffmpeg (extract audio)  → source.wav, 16 kHz mono" },
    { stage: 2, text: "[2/5] transcribe: Whisper transcript + LLM translation" },
    { stage: 2, text: "[3/5] speech: shorten blocks that will not fit (LLM) and read them (VieNeu) -- at the same time" },
    { stage: 2, text: "[1/3] Loading Whisper large-v3...\nTranscribing..." },
    { stage: 2, text: "Reading the whole transcript for the video brief (topic, speaker, names, misheard words)..." },
    { stage: 2, text: `Video brief: speaker ${heard}\n  heard 孙子悲话 -> 孙子兵法` },
    { stage: 2, text: "[2/3] Creating translation chunks...  (~20 s each)" },
    { stage: 2, text: "[3/3] Translating with groq:qwen/qwen3.8-27b, checking with gemini:gemini-3.1-flash-lite..." },
    { stage: 3, text: "Pipeline complete.\nTranslation complete" },
    { stage: 3, text: "VieNeu loaded · voice xuan_vinh\n[block] too long for its slot -> shortened by the LLM before reading" },
    { stage: 3, text: "Speech done" },
    { stage: 4, text: "[4/5] assemble: place the clips on the original timeline\n  drift ≤ 3 s · speed-up ≤ 1.3x · every clip at -20 dBFS" },
    { stage: 5, text: "[5/5] mux: put the dub track into the video" },
    { stage: 5, text: subs ? "  Vietnamese subtitles in a bar under the picture (libx264, crf 18)" : "  video copied as is (no re-encode), original audio at 0.02" },
    { stage: 5, text: "Cleanup (all): freed 349 MB" },
    { stage: 6, text: "================================\nDone: dub_jobs_output/VIDEO_ID/dub_output/dubbed.mp4\n================================" },
  ];
}

function WebPage({ demo }: { demo?: boolean }) {
  const [speaker, setSpeaker] = useState("");
  const [subs, setSubs] = useState(true);
  const [at, setAt] = useState(-1); // last log line shown; -1 = no job yet
  const [playing, setPlaying] = useState(false);
  const [watching, setWatching] = useState(false); // the mock player in "Finished videos"
  const lines = script(speaker, subs);
  const last = lines.length - 1;
  const done = at >= last;
  const stage = at < 0 ? 0 : lines[at].stage; // 6 = finished
  const logRef = useRef<HTMLPreElement>(null);

  // a visitor's own run: one log line every 0.7 s
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setAt((a) => (a >= last ? a : a + 1)), 700);
    return () => clearInterval(id);
  }, [playing, last]);
  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [at]);

  const start = () => {
    setWatching(false);
    setAt(0);
    setPlaying(true);
  };

  // autoplay: the whole job, then linger on "Done"
  const steps: (() => void)[] = [() => { setPlaying(false); setAt(-1); setWatching(false); }];
  lines.forEach((_, i) => steps.push(() => setAt(i)));
  steps.push(() => setWatching(true), () => {}, () => {}, () => {});
  useDemo(demo, steps, 900);

  const label = done ? "All steps done" : stage ? `Step ${stage}/5: ${STEPS[stage - 1]}` : "";
  const percent = done ? 100 : Math.min(94, Math.round(((at + 1) / (last + 1)) * 100));

  return (
    <div className="yd-win" aria-label="Replay of the YouTube Dubber web page">
      <div className="yd-chrome">
        <i /><i /><i />
        <span>127.0.0.1:8765</span>
      </div>
      <div className="yd-page">
        <h4>YouTube Dubber</h4>
        <p className="yd-muted">Paste a Chinese video link. This page translates it, dubs it in Vietnamese and exports the finished video.</p>

        <form className="yd-card" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <div className="yd-row">
            <input type="text" value={URL} readOnly aria-label="YouTube link" />
            <button type="submit" disabled={playing}>Make video</button>
          </div>
          <div className="yd-opts">
            <label>
              Speaker
              <select value={speaker} onChange={(e) => setSpeaker(e.target.value)}>
                <option value="">Same as last time / auto</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={subs} onChange={(e) => setSubs(e.target.checked)} /> Add Vietnamese subtitles
            </label>
            <label>
              Original volume <input type="number" value="0.02" readOnly aria-label="Original volume" />
            </label>
          </div>
        </form>

        <h5>In progress</h5>
        <div className="yd-jobs">
        {at < 0 ? (
          <p className="yd-muted">No links yet.</p>
        ) : (
          <div className="yd-card yd-job">
            <div className="yd-jobhead">
              <b>{URL}</b>
              <em className={done ? "ok" : ""}>{done ? "Done" : "Running"}</em>
            </div>
            <div className="yd-seg">
              {STEPS.map((s, i) => (
                <span key={s} className={done || i + 1 < stage ? "on" : i + 1 === stage ? "now" : ""} title={s}>
                  <small>{STEPS_EN[i]}</small>
                </span>
              ))}
            </div>
            <p className="yd-muted">{label}</p>
            <div className="yd-bar"><i style={{ width: `${percent}%` }} /></div>
            <p className="yd-muted">{done ? "Ran for 37 min 50 s" : "Running…"}</p>
            <pre ref={logRef} aria-live="polite">{lines.slice(0, at + 1).map((l) => l.text).join("\n\n")}</pre>
            {done && <p className="yd-muted">The video is under “Finished videos” below.</p>}
          </div>
        )}
        </div>

        <h5>Finished videos</h5>
        <div className="yd-fin">
          {!done ? (
            <p className="yd-muted">No videos yet.</p>
          ) : (
            <div className="yd-card yd-vid">
              <button
                type="button"
                className={`yd-thumb${watching ? " is-playing" : ""}`}
                onClick={() => setWatching((w) => !w)}
                aria-label={watching ? "Pause preview" : "Play preview"}
              >
                <span className="yd-pic" aria-hidden>{watching ? "▮▮" : "▶"}</span>
                <span className="yd-sub">{subs ? "Vietnamese subtitles sit here, in the black bar under the picture" : ""}</span>
                <span className="yd-scrub" aria-hidden><i /></span>
              </button>
              <div className="yd-vinfo">
                <b>VIDEO_ID</b>
                <span className="yd-muted">dubbed.mp4 · Vietnamese voice-over{subs ? " + subtitles" : ""}</span>
                <div className="yd-acts">
                  <span>Download</span>
                  <span>Make thumbnail</span>
                  <span>Translate again</span>
                  <span>Delete</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- pipeline ---------- */

type Part = { name: string; where: "local" | "llm"; what: string };
type Stage = { n: number; name: string; parts: Part[] };

const PIPE: Stage[] = [
  {
    n: 1,
    name: "Download",
    parts: [
      { name: "yt-dlp", where: "local", what: "Downloads the video (up to 720p by default) to source.mp4." },
      { name: "ffmpeg", where: "local", what: "Extracts 16 kHz mono source.wav for speech recognition." },
    ],
  },
  {
    n: 2,
    name: "Transcribe + translate",
    parts: [
      { name: "Whisper large-v3", where: "local", what: "faster-whisper on the GPU (float16) transcribes the Chinese speech. The start of the video title is passed in, so it hears the topic's names better." },
      { name: "Video brief", where: "llm", what: "One call reads the whole transcript: summary, speaker, how the audience is addressed, a term sheet, and words Whisper misheard (孙子悲话 → 孙子兵法), fixed before translating." },
      { name: "Translate", where: "llm", what: "Windows of about 20 s, translated with the brief and the glossary. Every window is cached, so a quota stop costs nothing." },
      { name: "Review", where: "llm", what: "Optional second model reads the Chinese next to the draft and returns only the lines to change." },
    ],
  },
  {
    n: 3,
    name: "Speech",
    parts: [
      { name: "Shorten", where: "llm", what: "Segments merge into 4–10 s blocks. A block that won't fit its time slot is shortened before it is read." },
      { name: "VieNeu TTS", where: "local", what: "VieNeu v3 Turbo reads each block, on the CPU (ONNX) or the GPU, about 12x faster per sentence on an RTX 4060 Laptop." },
    ],
  },
  {
    n: 4,
    name: "Assemble",
    parts: [
      { name: "Timeline", where: "local", what: "Places clips on the original timeline: at least 0.25 s apart, drift up to 3 s, speed-up to at most 1.3x, every clip at -20 dBFS." },
    ],
  },
  {
    n: 5,
    name: "Mux",
    parts: [
      { name: "ffmpeg", where: "local", what: "Mixes the dub with the original audio (0.02 by default) into dubbed.mp4, with optional Vietnamese subtitles in a bar under the picture." },
    ],
  },
];

const ALL = PIPE.flatMap((s) => s.parts.map((p) => ({ ...p, stage: s.n })));

function Pipeline({ demo }: { demo?: boolean }) {
  const [sel, setSel] = useState(0);
  const cur = ALL[sel];
  useDemo(demo, ALL.map((_, i) => () => setSel(i)), 2200);

  return (
    <div className="yd-pipe">
      <ol className="yd-stages">
        {PIPE.map((s) => (
          <li key={s.n} className={`${cur.stage === s.n ? "on" : ""}${s.n === 2 || s.n === 3 ? " yd-par" : ""}`}>
            <span className="eyebrow">{s.n} · {s.name}</span>
            {s.parts.map((p) => {
              const i = ALL.findIndex((a) => a.stage === s.n && a.name === p.name);
              return (
                <button key={p.name} className={`yd-part ${p.where}`} aria-pressed={sel === i} onClick={() => setSel(i)}>
                  {p.name}
                </button>
              );
            })}
          </li>
        ))}
      </ol>
      <p className="yd-together">stages 2 and 3 run at the same time: speech reads blocks as soon as they are translated</p>
      <div className="yd-detail" aria-live="polite">
        <span className={`yd-where ${cur.where}`}>{cur.where === "local" ? "runs on the computer" : "LLM · text only"}</span>
        <b>{cur.name}</b>
        <p>{cur.what}</p>
      </div>
      <p className="yd-legend">
        <span className="yd-where local">local</span> audio and video never leave the computer ·{" "}
        <span className="yd-where llm">LLM</span> Groq, Gemini, or local Ollama / LM Studio, with a fallback when a daily quota runs out ·
        finished stages are cached per video, so an interrupted run resumes
      </p>
    </div>
  );
}

/* ---------- tabs ---------- */

const TABS = [
  { id: "web", label: "Web page · replay", Component: WebPage },
  { id: "pipe", label: "Pipeline · 5 stages", Component: Pipeline },
] as const;

export default function DubberFig({ demo }: { demo?: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("web");
  return (
    <div className="yd">
      <div className="vf-tabs" role="tablist" aria-label="YouTube Dubber figures">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map(({ id, Component }) => (
        <div key={id} role="tabpanel" hidden={tab !== id}>
          <Component demo={demo && id === tab} />
        </div>
      ))}
    </div>
  );
}
