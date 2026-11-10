"use client";

import { useEffect, useRef, useState } from "react";
import { useDemo } from "./useDemo";

/*
 * FIG: CI/CD, as at Althea Room.
 * A made-up Android pull request runs through build → tests → dependency audit → Sonar → security scan.
 * The scan blocks the merge until each finding is fixed and the pipeline is re-run.
 * Once it's green, the release goes to Google Play one track at a time.
 * Made-up repo, findings and code. Not Althea Room's pipeline.
 */

const STAGES = ["build", "tests", "dependency audit", "sonar", "security scan"] as const;
const SCAN = STAGES.length - 1;
type StageState = "idle" | "running" | "pass" | "fail";

type Finding = { id: string; severity: "HIGH" | "MEDIUM"; rule: string; file: string; before: string; after: string };

const FINDINGS: Finding[] = [
  {
    id: "token",
    severity: "HIGH",
    rule: "Auth token stored in plain SharedPreferences",
    file: "auth/TokenStore.kt:24",
    before: `prefs.edit().putString("token", token).apply()`,
    after: `encryptedPrefs.edit().putString("token", token).apply()`,
  },
  {
    id: "cleartext",
    severity: "HIGH",
    rule: "Cleartext HTTP traffic allowed",
    file: "AndroidManifest.xml:12",
    before: `android:usesCleartextTraffic="true"`,
    after: `android:usesCleartextTraffic="false"`,
  },
  {
    id: "log",
    severity: "MEDIUM",
    rule: "Session token written to logs",
    file: "auth/AuthRepository.kt:58",
    before: `Log.d("auth", "login ok, token=$token")`,
    after: `Log.d("auth", "login ok")`,
  },
];

const LOG: Record<(typeof STAGES)[number], string[]> = {
  build: ["./gradlew assembleRelease", "✓ app-release.aab built in 1m 12s"],
  tests: ["./gradlew testReleaseUnitTest", "✓ 214 passed in 38s"],
  "dependency audit": ["./gradlew dependencyCheckAnalyze", "✓ 0 known-vulnerable dependencies"],
  sonar: ["sonar-scanner (quality gate)", "✓ quality gate passed · coverage 81%"],
  "security scan": ["mobsfscan app/"],
};

const TRACKS = ["internal", "closed beta", "production"] as const;

export default function PipelineFig({ demo }: { demo?: boolean }) {
  const [states, setStates] = useState<StageState[]>(STAGES.map(() => "idle"));
  const [fixed, setFixed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(["$ waiting for a run"]);
  const [runs, setRuns] = useState(0);
  const [track, setTrack] = useState(-1); // highest Google Play track reached
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const remaining = FINDINGS.filter((f) => !fixed.has(f.id));
  const running = states.includes("running");
  // nothing has run yet: nudge the visitor to press Run
  const idle = runs === 0 && !running;
  const green = states.every((s) => s === "pass");
  const scanned = states[SCAN] === "fail" || states[SCAN] === "pass";

  function run() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRuns((r) => r + 1);
    setTrack(-1);
    setStates(STAGES.map(() => "idle"));
    setLog([`$ run #${runs + 1} on focus-android · pr-341 (feat: offline streaks)`]);
    const willFail = remaining.length > 0;
    STAGES.forEach((stage, i) => {
      const t0 = i * 600;
      timers.current.push(
        setTimeout(() => {
          setStates((s) => s.map((x, j) => (j === i ? "running" : x)));
          setLog((l) => [...l, `$ ${LOG[stage][0]}`]);
        }, t0),
        setTimeout(() => {
          const fail = i === SCAN && willFail;
          setStates((s) => s.map((x, j) => (j === i ? (fail ? "fail" : "pass") : x)));
          if (i < SCAN) setLog((l) => [...l, LOG[stage][1]]);
          else
            setLog((l) => [
              ...l,
              willFail ? `✗ ${remaining.length} finding${remaining.length > 1 ? "s" : ""}, merge and release blocked` : "✓ 0 findings, ready to release",
            ]);
        }, t0 + 500),
      );
    });
  }

  function fix(id: string) {
    setFixed((s) => new Set(s).add(id));
    setOpen(null);
    setLog((l) => [...l, `• patched ${FINDINGS.find((f) => f.id === id)!.file}, re-run to verify`]);
    // a fix invalidates the old result
    setStates((s) => s.map((x, j) => (j === SCAN && x === "fail" ? "idle" : x)));
  }

  function promote() {
    const next = track + 1;
    const name = TRACKS[next];
    setLog((l) => [...l, `$ fastlane supply --track ${name.replace(" ", "-")}${name === "production" ? " --rollout 0.1" : ""}`]);
    timers.current.push(
      setTimeout(() => {
        setTrack(next);
        setLog((l) => [...l, name === "production" ? "✓ live on Google Play · staged rollout 10%" : `✓ on the ${name} track`]);
      }, 500),
    );
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    setStates(STAGES.map(() => "idle"));
    setFixed(new Set());
    setOpen(null);
    setRuns(0);
    setTrack(-1);
    setLog(["$ waiting for a run"]);
  }

  const wait = () => {};
  useDemo(
    demo,
    [
      reset,
      run, wait, wait, wait,
      () => setOpen(FINDINGS[0].id),
      () => FINDINGS.forEach((f) => fix(f.id)),
      run, wait, wait, wait,
      promote, promote, promote, wait, wait,
    ],
    900,
  );

  const label = (s: StageState) => (s === "idle" ? "queued" : s === "running" ? "running…" : s === "pass" ? "passed" : "failed");

  return (
    <div className="pf">
      <ol className="pf-stages pf-stages-5" aria-label="Pipeline stages">
        {STAGES.map((s, i) => (
          <li key={s} className={`pf-${states[i]}`}>
            <i aria-hidden />
            <span>{s}</span>
            <small>{label(states[i])}</small>
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

          <div className="pf-row pf-release-head">
            <span className="eyebrow">Google Play release</span>
            <span className="eyebrow">{green ? (track < 0 ? "ready" : TRACKS[track]) : "blocked until green"}</span>
          </div>
          <ol className="pf-tracks" aria-label="Google Play tracks">
            {TRACKS.map((t, i) => (
              <li key={t} className={i <= track ? "on" : ""}>
                {t}
                {t === "production" && <small> · 10% rollout</small>}
              </li>
            ))}
          </ol>
        </div>

        <div className="pf-console">
          <pre aria-live="polite" className={idle ? "is-idle" : ""}>{log.slice(-9).join("\n")}</pre>
          <div className={`pf-merge ${green ? "ok" : scanned ? "blocked" : ""}`}>
            {green ? "✓ All checks passed. Merge and release unlocked." : scanned ? "✗ Merge and release blocked by security scan" : "Checks haven’t run"}
          </div>
          <div className="pf-actions">
            <button className={`pf-run ${idle ? "is-idle" : ""}`} onClick={run} disabled={running}>
              {running ? "Running…" : runs ? "Re-run" : "Run pipeline"}
            </button>
            {green && track < TRACKS.length - 1 && (
              <button className="pf-run" onClick={promote}>
                {track < 0 ? "Release to internal" : `Promote to ${TRACKS[track + 1]}`}
              </button>
            )}
            <button onClick={reset} disabled={running}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
