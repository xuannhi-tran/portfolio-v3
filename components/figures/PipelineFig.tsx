"use client";

import { useEffect, useRef, useState } from "react";

/*
 * FIG: CI pipeline, as at Althea Room.
 * A made-up pull request runs through build → test → static analysis → security scan.
 * The scan blocks the merge until each finding is fixed and the pipeline is re-run.
 * Made-up repo, findings and code. Not Althea Room's pipeline.
 */

const STAGES = ["build", "test", "static analysis", "security scan"] as const;
type StageState = "idle" | "running" | "pass" | "fail";

type Finding = { id: string; severity: "HIGH" | "MEDIUM" | "LOW"; rule: string; file: string; before: string; after: string };

const FINDINGS: Finding[] = [
  {
    id: "sqli",
    severity: "HIGH",
    rule: "SQL built from user input",
    file: "api/bookings.py:42",
    before: `cur.execute(f"SELECT * FROM bookings WHERE user_id = {user_id}")`,
    after: `cur.execute("SELECT * FROM bookings WHERE user_id = %s", (user_id,))`,
  },
  {
    id: "secret",
    severity: "HIGH",
    rule: "Hard-coded secret",
    file: "config/settings.py:9",
    before: `JWT_SECRET = "dev-secret-123"`,
    after: `JWT_SECRET = os.environ["JWT_SECRET"]`,
  },
  {
    id: "cookie",
    severity: "MEDIUM",
    rule: "Session cookie missing Secure flag",
    file: "auth/session.py:17",
    before: `resp.set_cookie("sid", sid, httponly=True)`,
    after: `resp.set_cookie("sid", sid, httponly=True, secure=True, samesite="Lax")`,
  },
];

const LOG: Record<(typeof STAGES)[number], string[]> = {
  build: ["docker build -t api:pr-218 .", "✓ image built in 41s"],
  test: ["pytest -q", "✓ 126 passed in 18.2s"],
  "static analysis": ["ruff check . && mypy api/", "✓ no issues"],
  "security scan": ["bandit -r api/ && pip-audit"],
};

export default function PipelineFig() {
  const [states, setStates] = useState<StageState[]>(STAGES.map(() => "idle"));
  const [fixed, setFixed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(["$ waiting for a run"]);
  const [runs, setRuns] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const remaining = FINDINGS.filter((f) => !fixed.has(f.id));
  const running = states.includes("running");
  const green = states.every((s) => s === "pass");
  const scanned = states[3] === "fail" || states[3] === "pass";

  function run() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRuns((r) => r + 1);
    setStates(STAGES.map(() => "idle"));
    setLog([`$ run #${runs + 1} on pr-218 (feat: booking history)`]);
    const willFail = remaining.length > 0;
    STAGES.forEach((stage, i) => {
      const t0 = i * 700;
      timers.current.push(
        setTimeout(() => {
          setStates((s) => s.map((x, j) => (j === i ? "running" : x)));
          setLog((l) => [...l, `$ ${LOG[stage][0]}`]);
        }, t0),
        setTimeout(() => {
          const fail = i === 3 && willFail;
          setStates((s) => s.map((x, j) => (j === i ? (fail ? "fail" : "pass") : x)));
          if (i < 3) setLog((l) => [...l, LOG[stage][1]]);
          else
            setLog((l) => [
              ...l,
              willFail ? `✗ ${remaining.length} finding${remaining.length > 1 ? "s" : ""}, merge blocked` : "✓ 0 findings, merge allowed",
            ]);
        }, t0 + 600),
      );
    });
  }

  function fix(id: string) {
    setFixed((s) => new Set(s).add(id));
    setOpen(null);
    setLog((l) => [...l, `• patched ${FINDINGS.find((f) => f.id === id)!.file}, re-run to verify`]);
    // a fix invalidates the old result
    setStates((s) => s.map((x, j) => (j === 3 && x === "fail" ? "idle" : x)));
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    setStates(STAGES.map(() => "idle"));
    setFixed(new Set());
    setOpen(null);
    setRuns(0);
    setLog(["$ waiting for a run"]);
  }

  return (
    <div className="pf">
      <ol className="pf-stages" aria-label="Pipeline stages">
        {STAGES.map((s, i) => (
          <li key={s} className={`pf-${states[i]}`}>
            <i aria-hidden />
            <span>{s}</span>
            <small>{states[i] === "idle" ? "queued" : states[i] === "running" ? "running…" : states[i] === "pass" ? "passed" : "failed"}</small>
          </li>
        ))}
      </ol>

      <div className="pf-grid">
        <div className="pf-findings">
          <div className="pf-row">
            <span className="eyebrow">Security findings</span>
            <span className="eyebrow">{scanned || fixed.size ? `${FINDINGS.length - remaining.length} / ${FINDINGS.length} fixed` : "run the pipeline"}</span>
          </div>
          {!scanned && fixed.size === 0 ? (
            <p className="pf-empty">The scan hasn’t run yet. Press Run.</p>
          ) : (
            <ul>
              {FINDINGS.map((f) => {
                const done = fixed.has(f.id);
                return (
                  <li key={f.id} className={done ? "done" : ""}>
                    <button className="pf-finding" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id} disabled={done}>
                      <em className={`sev-${f.severity}`}>{done ? "FIXED" : f.severity}</em>
                      <span>{f.rule}</span>
                      <small>{f.file}</small>
                    </button>
                    {open === f.id && !done && (
                      <div className="pf-diff">
                        <code className="del">- {f.before}</code>
                        <code className="add">+ {f.after}</code>
                        <button onClick={() => fix(f.id)}>Apply fix</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="pf-console">
          <pre aria-live="polite">{log.slice(-9).join("\n")}</pre>
          <div className={`pf-merge ${green ? "ok" : scanned ? "blocked" : ""}`}>
            {green ? "✓ All checks passed. Ready to merge." : scanned ? "✗ Merge blocked by security scan" : "Checks haven’t run"}
          </div>
          <div className="pf-actions">
            <button className="pf-run" onClick={run} disabled={running}>{running ? "Running…" : runs ? "Re-run" : "Run pipeline"}</button>
            <button onClick={reset} disabled={running}>Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}
