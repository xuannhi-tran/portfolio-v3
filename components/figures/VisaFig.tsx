"use client";

import { useMemo, useState } from "react";

/*
 * FIG: visa check, as in JobCompass.
 * The real tool uses an LLM to extract facts from a job ad and then applies rules.
 * Here simple patterns stand in for the LLM so it runs in the browser; the rules and the
 * "quote the evidence, never guess eligible" behaviour are the same idea.
 * Simplified for illustration. Not migration advice.
 */

const ADS: { name: string; text: string }[] = [
  {
    name: "Café crew",
    text:
      "Harbour Bean Café is hiring casual baristas for our Newtown store. Shifts are 15 to 20 hours per week, with flexible rostering around uni timetables. Barista experience preferred but training is provided.",
  },
  {
    name: "Grad analyst",
    text:
      "Join our graduate data program in Canberra. This is a full-time role, 38 hours per week. Applicants must be an Australian citizen and able to obtain a Baseline security clearance.",
  },
  {
    name: "Warehouse",
    text:
      "Pick-packers needed for our Wetherill Park warehouse. Full-time, Monday to Friday, 7am to 3:30pm. Forklift licence is a bonus. Immediate start.",
  },
];

type Kind = "bad" | "warn" | "ok" | "info";
type Finding = { rule: string; kind: Kind; quote: string; start: number; end: number; note: string };

const LIMIT = 48; // hours per fortnight while the course is in session

function analyse(text: string): Finding[] {
  const out: Finding[] = [];
  const find = (re: RegExp, rule: string, kind: Kind, note: (m: RegExpExecArray) => string) => {
    const m = re.exec(text);
    if (!m) return null;
    const f: Finding = { rule, kind, quote: m[0], start: m.index, end: m.index + m[0].length, note: note(m) };
    out.push(f);
    return { m, f };
  };

  find(/(must be an? |requires? (an? )?)?(australian citizen(ship)?|permanent residen(t|cy)|\bPR\b)[^.]*/i, "Work rights", "bad", () => "Needs citizenship or PR. A student visa does not qualify.");
  find(/(baseline|nv1|nv2|negative vetting)[^.]*clearance|security clearance/i, "Clearance", "bad", () => "Security clearances generally require citizenship.");

  const hours = find(/(\d{1,2})(\s*(?:to|-|–)\s*(\d{1,2}))?\s*hours?\s*(?:per|a|\/)\s*(week|fortnight)/i, "Hours", "info", () => "");
  if (hours) {
    const { m, f } = hours;
    const hi = Number(m[3] ?? m[1]);
    const perFortnight = m[4].toLowerCase() === "week" ? hi * 2 : hi;
    f.kind = perFortnight <= LIMIT ? "ok" : "warn";
    f.note =
      perFortnight <= LIMIT
        ? `Up to ${perFortnight} h per fortnight, within the ${LIMIT} h limit during semester.`
        : `${perFortnight} h per fortnight is over the ${LIMIT} h limit. Only possible in official breaks.`;
  }

  const full = find(/full[- ]time/i, "Role type", "warn", () => `Full-time usually means more than ${LIMIT} h per fortnight during semester.`);
  if (full && hours?.f.kind === "ok") full.f.kind = "info";

  find(/\b(casual|part[- ]time)\b/i, "Role type", "ok", () => "Casual or part-time work can fit around study.");
  find(/flexible[^.]*/i, "Flexibility", "ok", () => "Flexible rostering makes it easier to stay under the limit.");

  return out.sort((a, b) => a.start - b.start);
}

function verdict(f: Finding[]) {
  const bad = f.find((x) => x.kind === "bad");
  if (bad) return { label: "NOT ELIGIBLE", cls: "bad", why: bad };
  const warn = f.find((x) => x.kind === "warn");
  if (warn) return { label: "BREAKS ONLY", cls: "warn", why: warn };
  const hours = f.find((x) => x.rule === "Hours" && x.kind === "ok");
  if (hours) return { label: "LIKELY ELIGIBLE", cls: "ok", why: hours };
  // Unknown hours: refuse to say eligible. That's how the real tool kept false positives at 0%.
  return { label: "ASK THE EMPLOYER", cls: "info", why: null };
}

function Highlighted({ text, findings }: { text: string; findings: Finding[] }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  findings
    .filter((f, i, arr) => i === 0 || f.start >= arr[i - 1].end) // skip overlaps
    .forEach((f, i) => {
      if (f.start > at) parts.push(text.slice(at, f.start));
      parts.push(
        <mark key={i} className={`vf-${f.kind}`} style={{ animationDelay: `${i * 220}ms` }}>
          {text.slice(f.start, f.end)}
        </mark>,
      );
      at = f.end;
    });
  parts.push(text.slice(at));
  return <>{parts}</>;
}

export default function VisaFig() {
  const [ad, setAd] = useState(0);
  const [text, setText] = useState(ADS[0].text);
  const [editing, setEditing] = useState(false);
  const findings = useMemo(() => analyse(text), [text]);
  const v = verdict(findings);

  return (
    <div className="vf">
      <div className="vf-tabs" role="tablist" aria-label="Sample job ads">
        {ADS.map((a, i) => (
          <button
            key={a.name}
            role="tab"
            aria-selected={ad === i && !editing}
            onClick={() => {
              setAd(i);
              setText(a.text);
              setEditing(false);
            }}
          >
            {a.name}
          </button>
        ))}
        <button role="tab" aria-selected={editing} onClick={() => setEditing(true)}>Edit ad ✎</button>
      </div>

      <div className="vf-grid">
        <div className="vf-ad">
          <span className="eyebrow">job_ad.txt</span>
          {editing ? (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} aria-label="Job ad text" />
          ) : (
            <p key={text}>
              <Highlighted text={text} findings={findings} />
            </p>
          )}
          <p className="vf-legend">
            <mark className="vf-bad">blocks</mark> <mark className="vf-warn">limits</mark> <mark className="vf-ok">fits</mark> <mark className="vf-info">context</mark>
          </p>
        </div>

        <div className="vf-side">
          <ol className="vf-rules">
            {findings.length === 0 && <li className="vf-empty">No work-rights facts found in this ad.</li>}
            {findings.map((f, i) => (
              <li key={i} className={`vf-${f.kind}`}>
                <span className="eyebrow">{f.rule}</span>
                <span>{f.note}</span>
              </li>
            ))}
          </ol>
          <div className={`vf-verdict vf-${v.cls}`} aria-live="polite">
            <span className="eyebrow">Verdict</span>
            <b>{v.label}</b>
            {v.why ? <q>{v.why.quote}</q> : <span>Hours aren’t stated, so it won’t guess. When unsure, it never says eligible.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
