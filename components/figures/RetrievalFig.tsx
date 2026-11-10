"use client";

import { useMemo, useState } from "react";

/*
 * FIG: retrieval, as in the RAG Document Assistant.
 * A made-up handbook is split into chunks. The question and every chunk become vectors,
 * chunks are ranked by cosine similarity, and the top-k are used to answer with citations.
 * The vectors here are TF-IDF bag-of-words (so it runs in the browser); the real project uses
 * neural embeddings in pgvector, which also match across English and Vietnamese.
 */

const DOC = "riverside_library_handbook.pdf";

const CHUNKS = [
  "Members can borrow up to 12 books at a time. Loans last three weeks and can be renewed twice online.",
  "Late items are charged 50 cents per day, up to a maximum of 10 dollars per item. Fees must be paid before borrowing again.",
  "The library is open 8am to 9pm on weekdays. On weekends it opens 10am to 5pm, and it is closed on public holidays.",
  "Printing costs 10 cents per page in black and white and 40 cents per page in colour. Printers accept student cards.",
  "Group study rooms seat up to six people and can be booked for two hours per day through the website.",
  "Lost or damaged books are charged at replacement cost plus a 15 dollar processing fee.",
  "Quiet zones are on level 3. Phone calls and group discussion are not allowed there.",
  "Laptops can be borrowed from the front desk for four hours with a student card. Late laptops are charged 5 dollars per hour.",
];

const PRESETS = [
  "How many books can I borrow?",
  "What happens if I return a book late?",
  "Is the library open on weekends?",
  "How much does colour printing cost?",
];

const STOP = new Set(
  "a an the is are am be to of in on at for and or if i my me you your it its can do does how what when where which who much many there with by as from per up not this that than then".split(" "),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t))
    .map((t) => (t === "color" ? "colour" : t));
}

type Vec = Map<string, number>;

function buildIndex() {
  const docs = CHUNKS.map(tokens);
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const idf = (t: string) => Math.log(1 + CHUNKS.length / (df.get(t) ?? 0.5));
  const vec = (toks: string[]): Vec => {
    const v: Vec = new Map();
    toks.forEach((t) => v.set(t, (v.get(t) ?? 0) + 1));
    v.forEach((tf, t) => v.set(t, tf * idf(t)));
    return v;
  };
  return { vec, chunkVecs: docs.map(vec) };
}

function cosine(a: Vec, b: Vec) {
  let dot = 0;
  a.forEach((x, t) => (dot += x * (b.get(t) ?? 0)));
  const norm = (v: Vec) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  const n = norm(a) * norm(b);
  return n ? dot / n : 0;
}

export default function RetrievalFig() {
  const index = useMemo(buildIndex, []);
  const [q, setQ] = useState(PRESETS[1]);
  const [k, setK] = useState(2);
  const [asked, setAsked] = useState(PRESETS[1]);
  const [run, setRun] = useState(0); // bumps to replay the bar animation

  const qVec = useMemo(() => index.vec(tokens(asked)), [index, asked]);
  const scores = useMemo(() => index.chunkVecs.map((v) => cosine(qVec, v)), [index, qVec]);
  const ranked = useMemo(() => scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s), [scores]);
  const top = ranked.slice(0, k).filter((r) => r.s > 0.05);
  const topSet = new Set(top.map((r) => r.i));

  // Extractive "answer": the best-matching sentence from each retrieved chunk, with its citation.
  const answer = top.map(({ i }) => {
    const sentences = CHUNKS[i].split(/(?<=\.)\s+/);
    const best = sentences
      .map((s) => ({ s, score: cosine(qVec, index.vec(tokens(s))) }))
      .sort((a, b) => b.score - a.score)[0];
    return { text: best.s, cite: i + 1 };
  });

  function ask(text: string) {
    setQ(text);
    setAsked(text);
    setRun((r) => r + 1);
  }

  return (
    <div className="rf">
      <form
        className="rf-ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) ask(q.trim());
        }}
      >
        <label className="eyebrow" htmlFor="rf-q">Question</label>
        <div className="rf-input">
          <input id="rf-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the handbook anything" maxLength={120} />
          <button type="submit">Retrieve</button>
        </div>
        <div className="rf-presets">
          {PRESETS.map((p) => (
            <button type="button" key={p} aria-pressed={asked === p} onClick={() => ask(p)}>{p}</button>
          ))}
        </div>
        <div className="rf-k">
          <label htmlFor="rf-k" className="eyebrow">top-k</label>
          <input id="rf-k" type="range" min={1} max={4} value={k} onChange={(e) => setK(Number(e.target.value))} />
          <output className="eyebrow">{k}</output>
        </div>
      </form>

      <div className="rf-grid">
        <ol className="rf-chunks" key={run} aria-label={`Chunks of ${DOC}, scored against the question`}>
          {CHUNKS.map((c, i) => {
            const rank = ranked.findIndex((r) => r.i === i);
            return (
              <li key={i} className={topSet.has(i) ? "hit" : ""} style={{ order: rank }}>
                <div className="rf-meta">
                  <span>chunk {String(i + 1).padStart(2, "0")}</span>
                  <span>{scores[i].toFixed(3)}</span>
                </div>
                <div className="rf-bar"><i style={{ width: `${Math.max(scores[i], 0.01) * 100}%`, animationDelay: `${rank * 60}ms` }} /></div>
                <p>{c}</p>
              </li>
            );
          })}
        </ol>

        <div className="rf-answer" aria-live="polite">
          <span className="eyebrow">Grounded answer</span>
          {answer.length ? (
            <p>
              {answer.map((a) => (
                <span key={a.cite}>
                  {a.text} <cite>[{a.cite}]</cite>{" "}
                </span>
              ))}
            </p>
          ) : (
            <p className="rf-none">Nothing in the handbook is close enough. A grounded assistant says “I don’t know” instead of guessing.</p>
          )}
          <span className="eyebrow">Sources</span>
          <ul>
            {top.map((r) => (
              <li key={r.i}>{DOC} · chunk {String(r.i + 1).padStart(2, "0")} · cos {r.s.toFixed(3)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
