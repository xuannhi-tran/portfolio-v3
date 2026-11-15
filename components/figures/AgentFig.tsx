"use client";

import { useState } from "react";
import { useDemo } from "./useDemo";

/*
 * FIG: the Ask Nhi Agent's LangGraph loop, replayed.
 * START → model → (tool call?) → tools → model … → no tool call → answer.
 * Queries and similarity scores are illustrative; the answers are trimmed from a real eval run.
 */

type Hit = { src: string; score: number };
type Step =
  | { kind: "call"; tool: "search_portfolio" | "match_job_description"; arg: string; why: string }
  | { kind: "result"; hits?: Hit[]; json?: string }
  | { kind: "answer"; text: string; cites: string[] };

type Run = { label: string; q: string; steps: Step[] };

const MAX_STEPS = 6; // the agent's recursion budget

const RUNS: Run[] = [
  {
    label: "Security work",
    q: "What security work has Nhi done?",
    steps: [
      { kind: "call", tool: "search_portfolio", arg: "security work", why: "Broad question, so search more than one way." },
      { kind: "result", hits: [{ src: "althea-room#What I did", score: 0.61 }, { src: "talentmatch#What I built", score: 0.52 }] },
      { kind: "call", tool: "search_portfolio", arg: "auth, access control, rate limiting", why: "Look for security work under other names." },
      { kind: "result", hits: [{ src: "talentmatch#What I built", score: 0.57 }, { src: "jobcompass#What I built", score: 0.41 }] },
      {
        kind: "answer",
        text: "At Althea Room, Nhi ran security reviews across 5 backend repos and patched 13 issues. On TalentMatch, Nhi added upload validation, role-based access control and firewall rules. JobCompass runs with rate limiting.",
        cites: ["althea-room", "talentmatch", "jobcompass"],
      },
    ],
  },
  {
    label: "Kubernetes?",
    q: "Has Nhi worked with Kubernetes?",
    steps: [
      { kind: "call", tool: "search_portfolio", arg: "Kubernetes", why: "Check the portfolio before answering." },
      { kind: "result", hits: [] },
      { kind: "call", tool: "search_portfolio", arg: "containers and deployment", why: "Nothing above 0.3. Try the nearest topic." },
      { kind: "result", hits: [{ src: "profile#Toolkit", score: 0.46 }, { src: "talentmatch#What I built", score: 0.39 }] },
      {
        kind: "answer",
        text: "No Kubernetes in Nhi's work so far. The closest is Docker, plus deployments on AWS EC2 behind Nginx and CI/CD with GitHub Actions.",
        cites: ["profile", "talentmatch"],
      },
    ],
  },
  {
    label: "Match a job ad",
    q: "Here's a job ad for an AI intern: Python, LangGraph, RAG, GCP…",
    steps: [
      { kind: "call", tool: "match_job_description", arg: "AI intern · Python, LangGraph, RAG, GCP", why: "A job ad, so use the matching tool." },
      { kind: "result", json: '{ "strong": ["Python", "RAG"], "partial": ["LangGraph"], "gaps": ["GCP"] }' },
      {
        kind: "answer",
        text: "Strong on Python and RAG, with LangGraph from this project. The gap is GCP: Nhi has deployed on AWS and Azure instead.",
        cites: ["rag-document-assistant", "ask-nhi-agent"],
      },
    ],
  },
];

/** Which part of the graph a step lights up. */
function focus(step: Step | undefined) {
  if (!step) return { node: "start", edge: "start" };
  if (step.kind === "call") return { node: "tools", edge: "call" };
  if (step.kind === "result") return { node: "model", edge: "back" };
  return { node: "end", edge: "end" };
}

export default function AgentFig({ demo }: { demo?: boolean }) {
  const [runIdx, setRunIdx] = useState(0);
  const [at, setAt] = useState(-1); // index of the last step shown; -1 = only the question
  const run = RUNS[runIdx];
  const done = at >= run.steps.length - 1;
  const { node, edge } = focus(run.steps[at]);
  const used = at + 1; // graph nodes visited: model, tools, model, …

  const pick = (i: number) => {
    setRunIdx(i);
    setAt(-1);
  };

  // autoplay: each run from the question to its answer, then the next run
  const script: (() => void)[] = [];
  RUNS.forEach((r, i) => {
    script.push(() => pick(i));
    r.steps.forEach((_, s) => script.push(() => setAt(s)));
    script.push(() => {}); // linger on the answer
  });
  useDemo(demo, script, 1500);

  const on = (e: string) => (edge === e ? "thread on" : "thread");
  const lit = (n: string) => `ag-node${node === n ? " on" : ""}`;

  return (
    <div className="ag">
      <div className="vf-tabs" role="tablist" aria-label="Questions">
        {RUNS.map((r, i) => (
          <button key={r.label} role="tab" aria-selected={runIdx === i} onClick={() => pick(i)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="ag-grid">
        <div className="ag-graph">
          <svg viewBox="0 0 360 230" role="img" aria-label="LangGraph loop: start, model, tools, answer">
            <path className={on("start")} d="M58 115 H118" />
            <path className={on("call")} d="M180 92 C 205 40, 245 38, 262 52" />
            <path className={on("back")} d="M262 78 C 240 98, 212 104, 190 104" />
            <path className={on("end")} d="M182 138 C 210 180, 240 186, 262 182" />
            <text className="ag-edge" x="206" y="36">tool call?</text>
            <text className="ag-edge" x="212" y="122">results</text>
            <text className="ag-edge" x="196" y="200">no tool call</text>

            <g className={lit("start")}>
              <rect x="10" y="101" width="48" height="28" rx="14" />
              <text x="34" y="119">START</text>
            </g>
            <g className={lit("model")}>
              <circle cx="152" cy="115" r="34" />
              <text x="152" y="112">model</text>
              <text className="ag-sub" x="152" y="127">Claude</text>
            </g>
            <g className={lit("tools")}>
              <rect x="262" y="34" width="90" height="52" rx="12" />
              <text x="307" y="57">tools</text>
              <text className="ag-sub" x="307" y="72">ToolNode</text>
            </g>
            <g className={lit("end")}>
              <rect x="262" y="166" width="90" height="32" rx="16" />
              <text x="307" y="186">answer</text>
            </g>
          </svg>
          <p className="ag-budget">
            step {used} / {MAX_STEPS}
            <span>{done ? "stopped: no more tool calls" : at < 0 ? "waiting" : "looping"}</span>
          </p>
        </div>

        <div className="ag-trace" aria-live="polite">
          <p className="ag-q">
            <span className="eyebrow">Question</span>
            {run.q}
          </p>
          <ol>
            {run.steps.slice(0, at + 1).map((s, i) => (
              <li key={`${runIdx}-${i}`} className={`ag-${s.kind}`}>
                {s.kind === "call" && (
                  <>
                    <code>
                      {s.tool}(&quot;{s.arg}&quot;)
                    </code>
                    <small>{s.why}</small>
                  </>
                )}
                {s.kind === "result" &&
                  (s.json ? (
                    <code>{s.json}</code>
                  ) : s.hits && s.hits.length ? (
                    <ul>
                      {s.hits.map((h) => (
                        <li key={h.src}>
                          <span>{h.src}</span>
                          <b>{h.score.toFixed(2)}</b>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small>no chunk above 0.30</small>
                  ))}
                {s.kind === "answer" && (
                  <>
                    <p>{s.text}</p>
                    <small>{s.cites.map((c) => `[${c}]`).join(" ")}</small>
                  </>
                )}
              </li>
            ))}
          </ol>
          <div className="pf-actions">
            <button className="pf-run" onClick={() => setAt((a) => a + 1)} disabled={done}>
              {at < 0 ? "Run" : "Next step"}
            </button>
            <button onClick={() => setAt(-1)} disabled={at < 0}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
