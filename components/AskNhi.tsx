"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Graph } from "@/lib/content";
import { H, W, labelLayout, layout, threadPath } from "@/lib/graph-layout";

type Source = { n: number; id: string; source: string; title: string; heading: string; skills: string[]; similarity: number };
type Phase = "idle" | "retrieving" | "answering" | "done" | "error";

const SUGGESTED = [
  "Has Nhi used PostgreSQL in production?",
  "List Nhi’s technology and stack",
  "Has Nhi led a team?",
  "What security work has Nhi done?",
];

const MAX = 300;

/** Where a citation points: a case study for projects, the page sections for the rest. */
const hrefFor = (s: Source) => (s.source === "profile" ? "#about" : s.source === "faq" ? "#contact" : `/work/${s.source}`);

export default function AskNhi({ graph }: { graph: Graph }) {
  const pos = useMemo(() => layout(graph), [graph]);
  const labelPos = useMemo(() => labelLayout(graph, pos), [graph, pos]);
  const nodeIds = useMemo(() => new Set(graph.nodes.map((n) => n.id)), [graph]);
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sources, setSources] = useState<Source[]>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Nodes light up as the answer cites them, so the graph follows the text as it streams.
  const cited = useMemo(() => {
    const ns = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    return sources.filter((s) => ns.has(s.n));
  }, [answer, sources]);
  // profile and FAQ chunks belong to the "Nhi" node in the centre
  const nodeOf = (source: string) => (nodeIds.has(source) ? source : "profile");
  const skillNodes = useMemo(() => graph.nodes.filter((n) => n.kind === "skill"), [graph]);
  const said = `${asked ?? ""} ${answer}`.toLowerCase();
  const mentioned = (label: string) => new RegExp(`(^|[^a-z0-9])${label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(said);
  const isMentioned = (n: { id: string; label: string }) => mentioned(n.label) || mentioned(n.id.slice(6).replace(/-/g, " "));
  const citedSources = new Set(cited.map((s) => nodeOf(s.source)));
  // A profile chunk ("Software Engineer at Althea Room…") is cited under the centre node, so also light
  // any project or job the answer is about by name.
  if (citedSources.has("profile") && answer) {
    for (const n of graph.nodes) {
      if ((n.kind === "project" || n.kind === "experience") && mentioned(n.label.replace(/ LLC$/, ""))) citedSources.add(n.id);
    }
  }
  // Light the skills the answer is actually about. When it names none (an overview of a project), light
  // every skill of the projects it cites, so the whole branch glows.
  const projectSkills = (id: string) => graph.edges.filter((e) => e.source === id).map((e) => e.target);
  const citedSkills = new Set<string>();
  for (const id of citedSources) {
    const own = id === "profile" ? skillNodes.map((n) => n.id) : projectSkills(id);
    const named = skillNodes.filter((n) => own.includes(n.id) && isMentioned(n)).map((n) => n.id);
    (named.length || id === "profile" ? named : own).forEach((k) => citedSkills.add(k));
  }
  const retrieved = new Set(sources.map((s) => nodeOf(s.source)));
  const busy = phase === "retrieving" || phase === "answering";

  async function ask(q: string) {
    const question = q.trim().slice(0, MAX);
    if (!question || busy) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setAsked(question);
    setPhase("retrieving");
    setSources([]);
    setAnswer("");
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const e = JSON.parse(l);
          if (e.type === "sources") {
            setSources(e.sources);
            setPhase("answering");
          } else if (e.type === "text") setAnswer((a) => a + e.text);
          else if (e.type === "error") throw new Error(e.message);
          else if (e.type === "done") setPhase("done");
        }
      }
      setPhase((p) => (p === "answering" ? "done" : p));
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  const status =
    phase === "idle"
      ? "ASK ANYTHING"
      : phase === "retrieving"
        ? "RETRIEVING…"
        : phase === "answering"
          ? `${sources.length} RETRIEVED · WEAVING…`
          : phase === "error"
            ? "COULDN’T ANSWER"
            : `${cited.length} SOURCE${cited.length === 1 ? "" : "S"} WOVEN`;

  const threadOn = (s: string, t: string) =>
    (citedSources.has(s) && citedSkills.has(t)) || (s === "profile" && citedSources.has(t)) || hover === t;
  // while the answer is being written, the threads out to the retrieved sources pulse
  const threadSeek = (s: string, t: string) => s === "profile" && (phase === "retrieving" || (phase === "answering" && retrieved.has(t)));
  // Before a question the nodes sit unconnected. The answer weaves the threads: out to the projects it
  // retrieves or cites first, then from them to the skills it uses, one after another.
  // Hovering a skill draws its threads too.
  const order = [...citedSkills];
  const shown = (id: string) => id === "profile" || citedSources.has(id) || citedSkills.has(id) || retrieved.has(id);
  const delay = (id: string) => (citedSkills.has(id) ? 250 + order.indexOf(id) * 70 : 0);

  return (
    <figure className="fig" aria-labelledby="fig1-cap">
      <div className="fig-inner">
        <div className="fig-head">
          <span>KNOWLEDGE GRAPH</span>
          <span className={`fig-status ${busy ? "is-thinking" : ""}`} aria-live="polite">
            {status}
          </span>
        </div>
        <div className="ask-body">
          <div className="ask-chat">
            <form
              className="ask-form"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <label htmlFor="ask-input" className="eyebrow">
                Your question
              </label>
              <textarea
                id="ask-input"
                rows={2}
                maxLength={MAX}
                value={input}
                placeholder="e.g. Has Nhi worked with Docker?"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
              />
              <div className="ask-form-row">
                <small>{input.length}/{MAX}</small>
                <button type="submit" disabled={busy || !input.trim()}>
                  {busy ? "Thinking…" : "Ask ↵"}
                </button>
              </div>
            </form>

            {phase === "idle" && (
              <div className="ask-suggest">
                {SUGGESTED.map((q) => (
                  <button key={q} className="ask-q" onClick={() => { setInput(q); ask(q); }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {asked && <p className="ask-asked">“{asked}”</p>}

            <div className="ask-answer" aria-live="polite" aria-busy={busy}>
              {phase === "error" ? (
                <span className="ask-error">{error}</span>
              ) : answer ? (
                <Answer text={answer} sources={sources} />
              ) : phase === "idle" ? null : (
                <span className="ask-dots" aria-label="Loading" />
              )}
            </div>

            {phase === "done" && cited.length > 0 && (
              <details className="ask-src">
                <summary>
                  {cited.length} source{cited.length === 1 ? "" : "s"}
                </summary>
                <ol className="ask-sources">
                  {cited.map((s) => (
                    <li key={s.id}>
                      <Link href={hrefFor(s)}>
                        <b>[{s.n}]</b> {s.title} · {s.heading}
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {(phase === "done" || phase === "error") && (
              <button className="ask-reset" onClick={() => { setPhase("idle"); setAsked(null); setAnswer(""); setSources([]); setInput(""); }}>
                ← Other questions
              </button>
            )}
          </div>

          <div className="ask-graph">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Graph of Nhi's projects and the skills they use" className={`${phase !== "idle" ? "dim" : ""} ${phase === "retrieving" ? "thinking" : ""}`}>
              <g>
                {graph.edges.map((e) => {
                  const spoke = e.source === "profile";
                  const on = threadOn(e.source, e.target);
                  const show = on || (spoke && shown(e.source) && shown(e.target));
                  return (
                    <path
                      key={e.source + e.target}
                      d={threadPath(pos[e.source], pos[e.target])}
                      // a project-to-skill thread draws itself out (dash 1 of length 1); spokes just fade in
                      pathLength={spoke ? undefined : 1}
                      style={{ "--d": `${delay(e.target)}ms` } as React.CSSProperties}
                      className={`thread ${spoke ? "spoke" : "woven"} ${show ? "shown" : ""} ${on ? "on" : threadSeek(e.source, e.target) ? "seek" : ""}`}
                    />
                  );
                })}
                {/* skills the answer names from the toolkit, with no project thread of their own, hang off "Nhi" */}
                {citedSources.has("profile") &&
                  [...citedSkills]
                    .filter((t) => !graph.edges.some((e) => e.target === t && (citedSources.has(e.source))))
                    .map((t) => <path key={`hub-${t}`} d={threadPath(pos.profile, pos[t])} style={{ "--d": `${delay(t)}ms` } as React.CSSProperties} className="thread spoke shown on" />)}
              </g>
              <g>
                {graph.nodes.map((n) => {
                  const [x, y] = pos[n.id];
                  const isSkill = n.kind === "skill";
                  const label = labelPos[n.id];
                  const on = citedSources.has(n.id) || citedSkills.has(n.id);
                  const near = !on && retrieved.has(n.id);
                  const cls = `node ${isSkill ? "skill" : n.kind === "profile" ? "project hub" : "project"} ${on ? "on" : ""} ${near ? "near" : ""} ${hover === n.id ? "hit" : ""}`;
                  const inner = (
                    <>
                      <circle cx={x} cy={y} r={isSkill ? 3.5 : n.kind === "profile" ? 18 : 7} />
                      <text x={label.x} y={label.y} textAnchor={label.anchor}>
                        {n.label}
                      </text>
                      <title>{n.kind === "profile" ? "About Nhi" : n.label}</title>
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
        <b>FIG. 1</b>&nbsp; Claude answers only from Nhi’s portfolio, and the skills it uses light up.
      </figcaption>
    </figure>
  );
}

/** Answer text with [n] markers turned into links to the cited source. */
function Answer({ text, sources }: { text: string; sources: Source[] }) {
  const byN = new Map(sources.map((s) => [s.n, s]));
  return (
    <>
      {text.split(/(\[\d+\])/g).map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        const s = m ? byN.get(Number(m[1])) : undefined;
        return s ? (
          <Link key={i} className="cite" href={hrefFor(s)} title={`${s.title} · ${s.heading}`}>
            [{s.n}]
          </Link>
        ) : (
          <Linkified key={i} text={part} />
        );
      })}
    </>
  );
}

/** Plain links the answer writes out (email, LinkedIn, GitHub, any http URL) become real links. */
const URL_RE = /([\w.+-]+@[\w-]+\.[a-z]{2,}(?:\.[a-z]{2,})?|(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com)\/[^\s)\]]+|https?:\/\/[^\s)\]]+)/g;

function Linkified({ text }: { text: string }) {
  return (
    <span>
      {text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0) return part;
        const trail = part.match(/[.,;:!?]+$/)?.[0] ?? "";
        const url = trail ? part.slice(0, -trail.length) : part;
        return (
          <span key={i}>
            <a className="cite" href={url.includes("@") ? `mailto:${url}` : url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">
              {url}
            </a>
            {trail}
          </span>
        );
      })}
    </span>
  );
}
