"use client";

import { useState } from "react";
import { useDemo } from "./useDemo";

/*
 * FIG: match score, in the spirit of TalentMatch.
 * Each role weights skills and sets a target level. A student's score is the weighted share of
 * each target they meet, and a missing must-have caps the score. Illustrative formula with
 * made-up roles; not TalentMatch's exact scoring.
 */

const SKILLS = ["Python", "SQL", "Django", "React", "Git", "Communication"] as const;
type Skill = (typeof SKILLS)[number];

type Role = { name: string; company: string; weights: Partial<Record<Skill, number>>; target: Partial<Record<Skill, number>>; must: Skill };

const ROLES: Role[] = [
  {
    name: "Backend Intern",
    company: "Kestrel Logistics",
    weights: { Python: 0.3, SQL: 0.25, Django: 0.2, Git: 0.1, Communication: 0.15 },
    target: { Python: 4, SQL: 3, Django: 3, Git: 3, Communication: 3 },
    must: "Python",
  },
  {
    name: "Frontend Intern",
    company: "Paperbark Studio",
    weights: { React: 0.4, Git: 0.15, Communication: 0.25, SQL: 0.05, Python: 0.15 },
    target: { React: 4, Git: 3, Communication: 4, SQL: 1, Python: 2 },
    must: "React",
  },
];

const LEVELS = ["none", "basic", "coursework", "project", "work", "expert"];
const CAP = 40; // score cap when a must-have is below 2

function score(role: Role, me: Record<Skill, number>) {
  const parts = SKILLS.filter((s) => role.weights[s]).map((s) => {
    const w = role.weights[s]!;
    const t = role.target[s]!;
    const got = w * Math.min(me[s] / t, 1);
    return { s, w, t, got, gap: t - me[s] };
  });
  let total = Math.round(parts.reduce((a, p) => a + p.got, 0) * 100);
  const capped = me[role.must] < 2 && total > CAP;
  if (capped) total = CAP;
  // the cheapest single step that gains the most points
  const tip = parts
    .filter((p) => p.gap > 0)
    .map((p) => ({ ...p, gain: Math.round((p.w / p.t) * 100) }))
    .sort((a, b) => b.gain - a.gain)[0];
  return { parts, total, capped, tip };
}

export default function MatchFig({ demo }: { demo?: boolean }) {
  const [roleIdx, setRoleIdx] = useState(0);
  const [me, setMe] = useState<Record<Skill, number>>({ Python: 3, SQL: 2, Django: 1, React: 3, Git: 3, Communication: 4 });
  const role = ROLES[roleIdx];
  const { parts, total, capped, tip } = score(role, me);

  const START: Record<Skill, number> = { Python: 3, SQL: 2, Django: 1, React: 3, Git: 3, Communication: 4 };
  useDemo(
    demo,
    [
      () => { setRoleIdx(0); setMe(START); },
      () => setMe((m) => ({ ...m, Django: 3 })),
      () => setMe((m) => ({ ...m, SQL: 3, Python: 4 })),
      () => { setRoleIdx(1); setMe({ ...START, React: 1 }); },
      () => setMe((m) => ({ ...m, React: 4 })),
    ],
    2000,
  );

  return (
    <div className="mf">
      <div className="vf-tabs" role="tablist" aria-label="Roles">
        {ROLES.map((r, i) => (
          <button key={r.name} role="tab" aria-selected={roleIdx === i} onClick={() => setRoleIdx(i)}>
            {r.name} · {r.company}
          </button>
        ))}
      </div>

      <div className="mf-grid">
        <div className="mf-sliders">
          <span className="eyebrow">Student profile</span>
          {SKILLS.map((s) => (
            <label key={s} className={role.weights[s] ? "" : "mf-off"}>
              <span>
                {s}
                {s === role.must && <em>must-have</em>}
              </span>
              <input type="range" min={0} max={5} value={me[s]} onChange={(e) => setMe({ ...me, [s]: Number(e.target.value) })} aria-valuetext={LEVELS[me[s]]} />
              <small>{LEVELS[me[s]]}</small>
            </label>
          ))}
        </div>

        <div className="mf-result">
          <div className="mf-score" aria-live="polite">
            <svg viewBox="0 0 120 120" aria-hidden>
              <circle cx="60" cy="60" r="52" className="mf-track" />
              <circle cx="60" cy="60" r="52" className={`mf-arc ${capped ? "capped" : ""}`} strokeDasharray={`${(total / 100) * 326.7} 326.7`} />
            </svg>
            <div>
              <b>{total}%</b>
              <span>match for {role.name}</span>
            </div>
          </div>

          <ul className="mf-parts">
            {parts
              .slice()
              .sort((a, b) => b.w - a.w)
              .map((p) => (
                <li key={p.s}>
                  <span>{p.s}</span>
                  <span className="mf-bar">
                    <i style={{ width: `${(p.w / 0.4) * 100}%` }} className="max" />
                    <i style={{ width: `${(p.got / 0.4) * 100}%` }} className={p.gap > 0 ? "part" : "full"} />
                  </span>
                  <small>{Math.round(p.got * 100)}/{Math.round(p.w * 100)}</small>
                </li>
              ))}
          </ul>

          <p className="mf-why">
            {capped
              ? `Capped at ${CAP}%: ${role.must} is a must-have and needs at least “${LEVELS[2]}”.`
              : tip
                ? `Biggest win: one more level of ${tip.s} adds about +${tip.gain} points.`
                : "Every target met. This student is a strong match."}
          </p>
        </div>
      </div>
    </div>
  );
}
