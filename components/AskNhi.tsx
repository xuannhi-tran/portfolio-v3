"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Graph } from "@/lib/content";
import { CANNED_QA } from "@/lib/canned-qa";
import { CX, H, W, layout, threadPath } from "@/lib/graph-layout";

export default function AskNhi({ graph }: { graph: Graph }) {
  const pos = useMemo(() => layout(graph), [graph]);
  const labels = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.id, n.label])), [graph]);
  const [active, setActive] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "retrieving" | "done">("idle");
  const [hover, setHover] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qa = active === null ? null : CANNED_QA[active];
  const lit = phase === "done" && qa ? new Set([...qa.sources, ...qa.skills.map((s) => `skill:${s}`)]) : new Set<string>();
  const threadOn = (s: string, t: string) =>
    (phase === "done" && qa && qa.sources.includes(s) && qa.skills.includes(t.slice(6))) || hover === t;

  function ask(i: number) {
    if (timer.current) clearTimeout(timer.current);
    setActive(i);
    setPhase("retrieving");
    timer.current = setTimeout(() => setPhase("done"), 650);
  }

  const status =
    phase === "idle" ? "PICK A QUESTION" : phase === "retrieving" ? "RETRIEVING…" : `${qa!.sources.length} SOURCES WOVEN`;

  return (
    <figure className="fig" aria-labelledby="fig1-cap">
      <div className="fig-inner">
        <div className="fig-head">
          <span>ASK NHI · KNOWLEDGE GRAPH</span>
          <span className={`fig-status ${phase === "retrieving" ? "is-thinking" : ""}`} aria-live="polite">
            {status}
          </span>
        </div>
        <div className="ask-body">
          <div className="ask-chat">
            {CANNED_QA.map((item, i) => (
              <button key={item.q} className="ask-q" aria-pressed={active === i} onClick={() => ask(i)}>
                {item.q}
              </button>
            ))}
            <p className="ask-answer">
              {phase === "done" && qa
                ? qa.answer.map((part, i) => (
                    <span key={i}>
                      {part.text}
                      {part.cite && (
                        <>
                          {" "}
                          <Link className="cite" href={`/work/${part.cite}`}>
                            [{labels[part.cite]}]
                          </Link>
                        </>
                      )}
                    </span>
                  ))
                : phase === "retrieving"
                  ? ""
                  : "Answers appear here, with the sources they cite."}
            </p>
          </div>
          <div className="ask-graph">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Graph of Nhi's projects and the skills they use" className={phase !== "idle" ? "dim" : ""}>
              <g>
                {graph.edges.map((e) => (
                  <path
                    key={e.source + e.target}
                    d={threadPath(pos[e.source], pos[e.target])}
                    className={`thread ${threadOn(e.source, e.target) ? "on" : ""}`}
                  />
                ))}
              </g>
              <g>
                {graph.nodes.map((n) => {
                  const [x, y] = pos[n.id];
                  const isSkill = n.kind === "skill";
                  const right = x >= CX;
                  const cls = `node ${isSkill ? "skill" : "project"} ${lit.has(n.id) ? "on" : ""} ${hover === n.id ? "hit" : ""}`;
                  const inner = (
                    <>
                      <circle cx={x} cy={y} r={isSkill ? 3.5 : 7} />
                      <text
                        x={isSkill ? x + (right ? 7 : -7) : x}
                        y={isSkill ? y + 3 : y - 12}
                        textAnchor={isSkill ? (right ? "start" : "end") : "middle"}
                      >
                        {n.label}
                      </text>
                      <title>{n.label}</title>
                    </>
                  );
                  return isSkill ? (
                    <g key={n.id} className={cls} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
                      {inner}
                    </g>
                  ) : (
                    <a key={n.id} href={n.href} className={cls}>
                      {inner}
                    </a>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
      </div>
      <figcaption id="fig1-cap" className="fig-cap">
        <b>FIG. 1</b>&nbsp; Pick a question and the threads the answer is woven from light up. Hover a skill to see where it was used. These answers are pre-written for now; the live chatbot is coming.
      </figcaption>
    </figure>
  );
}
