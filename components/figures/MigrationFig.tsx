"use client";

import { useEffect, useRef, useState } from "react";
import { useDemo } from "./useDemo";

/*
 * FIG: database migration, as at Althea Room.
 * Copy 12 tables from a managed cluster to a self-hosted VPS, verify each table's checksum,
 * and only then cut over. Copying without freezing writes leaves one table out of date,
 * and the cutover stays locked until every checksum matches.
 * Made-up tables, row counts and hashes. Not Althea Room's database.
 */

type Table = { name: string; rows: number };
const TABLES: Table[] = [
  { name: "users", rows: 4_812 },
  { name: "sessions", rows: 18_442 },
  { name: "focus_blocks", rows: 61_208 },
  { name: "streaks", rows: 4_790 },
  { name: "goals", rows: 9_133 },
  { name: "reminders", rows: 12_067 },
  { name: "devices", rows: 6_301 },
  { name: "subscriptions", rows: 1_284 },
  { name: "tags", rows: 377 },
  { name: "block_tags", rows: 88_940 },
  { name: "settings", rows: 4_812 },
  { name: "audit_log", rows: 140_516 },
];
// tables that keep receiving writes while the app is live
const HOT = new Set(["sessions", "audit_log"]);

type Stage = "idle" | "copying" | "copied" | "verifying" | "verified" | "cutover" | "live" | "rolledback";
type Check = { state: "wait" | "ok" | "bad"; src: string; dst: string; srcRows: number; dstRows: number };

/** Deterministic fake md5-ish hash so the same data always shows the same checksum. */
function hash(s: string) {
  let h1 = 0x811c9dc5,
    h2 = 0x1234567;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 + s.charCodeAt(i), 2246822507);
  }
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).slice(0, 12);
}

const PLAN = [
  { id: "window", label: "Announce a maintenance window" },
  { id: "freeze", label: "Freeze writes (app in read-only mode)" },
  { id: "copy", label: "pg_dump → pg_restore on the VPS" },
  { id: "verify", label: "Verify row counts + checksums, 12/12" },
  { id: "switch", label: "Switch DATABASE_URL, smoke test" },
  { id: "rollback", label: "Keep the old cluster read-only for rollback" },
] as const;

export default function MigrationFig({ demo }: { demo?: boolean }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [frozen, setFrozen] = useState(false);
  const [frozenAtCopy, setFrozenAtCopy] = useState(false);
  const [copied, setCopied] = useState(0);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [log, setLog] = useState<string[]>(["$ focus-db migration · managed cluster → vps-01"]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const say = (l: string) => setLog((x) => [...x, l]);
  const busy = stage === "copying" || stage === "verifying" || stage === "cutover";
  const bad = Object.entries(checks).filter(([, c]) => c.state === "bad").map(([n]) => n);
  const okCount = Object.values(checks).filter((c) => c.state === "ok").length;
  const allOk = okCount === TABLES.length;

  function copy() {
    timers.current.forEach(clearTimeout);
    setStage("copying");
    setChecks({});
    setCopied(0);
    setFrozenAtCopy(frozen);
    say(frozen ? "$ app → read-only. writes frozen." : "! copying while the app is still writing");
    say("$ pg_dump -Fc focus | pg_restore -d focus_vps");
    TABLES.forEach((t, i) => later(120 * (i + 1), () => setCopied(i + 1)));
    later(120 * TABLES.length + 150, () => {
      setStage("copied");
      say(`✓ restored ${TABLES.length} tables`);
    });
  }

  function verify() {
    setStage("verifying");
    say("$ verify: count(*) + md5(string_agg(row ORDER BY id)) per table");
    TABLES.forEach((t, i) =>
      later(110 * (i + 1), () => {
        // without a write freeze, hot tables gained rows after they were copied
        const drift = !frozenAtCopy && HOT.has(t.name) ? (t.name === "sessions" ? 5 : 31) : 0;
        const prev = checks[t.name];
        const fixed = prev?.state === "ok";
        const srcRows = t.rows + drift;
        const dstRows = fixed ? srcRows : t.rows;
        setChecks((c) => ({
          ...c,
          [t.name]: {
            state: srcRows === dstRows ? "ok" : "bad",
            srcRows,
            dstRows,
            src: hash(t.name + srcRows),
            dst: hash(t.name + dstRows),
          },
        }));
      }),
    );
    later(110 * TABLES.length + 150, () => setStage("verified"));
  }

  function resync(name: string) {
    if (!frozen) {
      say(`! re-sync ${name} refused: freeze writes first, or it drifts again`);
      return;
    }
    say(`$ pg_dump -t ${name} | pg_restore --clean -t ${name}`);
    setChecks((c) => {
      const cur = c[name];
      return { ...c, [name]: { ...cur, state: "ok", dstRows: cur.srcRows, dst: cur.src } };
    });
    say(`✓ ${name}: ${checks[name].srcRows.toLocaleString()} rows, checksums match`);
  }

  function cutover() {
    setStage("cutover");
    say("$ export DATABASE_URL=postgres://…@vps-01/focus && restart api");
    later(600, () => say("$ smoke test: login, start focus block, sync streak"));
    later(1300, () => {
      say("✓ smoke test passed. app → read-write on vps-01");
      setStage("live");
      setFrozen(false);
    });
  }

  function rollback() {
    timers.current.forEach(clearTimeout);
    say("$ DATABASE_URL → managed cluster (kept read-only, untouched)");
    say("✓ rolled back in one step. no data lost.");
    setStage("rolledback");
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    setStage("idle");
    setFrozen(false);
    setFrozenAtCopy(false);
    setCopied(0);
    setChecks({});
    setLog(["$ focus-db migration · managed cluster → vps-01"]);
  }

  // Autoplay: copy without a freeze, watch two hot tables fail the checksum, freeze, re-sync them, cut over.
  const wait = () => {};
  useDemo(
    demo,
    [
      reset,
      copy, wait, wait,
      verify, wait, wait,
      () => setFrozen(true),
      () => bad.forEach(resync),
      wait,
      cutover, wait, wait, wait,
    ],
    1000,
  );

  const done: Record<(typeof PLAN)[number]["id"], boolean> = {
    window: frozen || stage === "live",
    freeze: frozen || stage === "live",
    copy: copied === TABLES.length,
    verify: allOk,
    switch: stage === "live",
    rollback: stage === "live" || stage === "rolledback",
  };

  const where = stage === "live" ? "vps" : "managed";

  return (
    <div className="mg">
      <div className="mg-top">
        <div className={`mg-db ${where === "managed" ? "live" : ""}`}>
          <span className="eyebrow">Old</span>
          <b>managed cluster</b>
          <small>{stage === "live" ? "read-only · rollback ready" : "serving the app"}</small>
        </div>
        <div className="mg-arrow" aria-hidden>
          <span style={{ width: `${(copied / TABLES.length) * 100}%` }} />
        </div>
        <div className={`mg-db ${where === "vps" ? "live" : ""}`}>
          <span className="eyebrow">New</span>
          <b>vps-01 (self-hosted)</b>
          <small>{stage === "live" ? "serving the app" : copied ? `${copied}/${TABLES.length} tables` : "empty"}</small>
        </div>
      </div>

      <div className="mg-grid">
        <div>
          <div className="pf-row">
            <span className="eyebrow">Tables</span>
            <span className="eyebrow">{Object.keys(checks).length ? `${okCount} / ${TABLES.length} verified` : "not verified"}</span>
          </div>
          <table className="mg-table">
            <thead>
              <tr>
                <th>table</th>
                <th>rows old → new</th>
                <th>checksum</th>
                <th aria-label="action" />
              </tr>
            </thead>
            <tbody>
              {TABLES.map((t, i) => {
                const c = checks[t.name];
                return (
                  <tr key={t.name} className={c ? `mg-${c.state}` : i < copied ? "mg-copied" : ""}>
                    <td>{t.name}</td>
                    <td>{c ? (c.srcRows === c.dstRows ? c.srcRows.toLocaleString() : `${c.srcRows.toLocaleString()} → ${c.dstRows.toLocaleString()}`) : i < copied ? t.rows.toLocaleString() : "·"}</td>
                    <td>{c ? (c.state === "ok" ? `✓ ${c.dst}` : `✗ ${c.src} ≠ ${c.dst}`) : ""}</td>
                    <td>
                      {c?.state === "bad" && (
                        <button onClick={() => resync(t.name)} title={frozen ? "" : "Freeze writes first"}>
                          re-sync
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pf-console">
          <span className="eyebrow">Cutover plan</span>
          <ol className="mg-plan">
            {PLAN.map((p) => (
              <li key={p.id} className={done[p.id] ? "done" : ""}>
                {p.label}
              </li>
            ))}
          </ol>
          <label className="mg-freeze">
            <input type="checkbox" checked={frozen} disabled={busy || stage === "live"} onChange={(e) => setFrozen(e.target.checked)} />
            Freeze writes
          </label>
          <pre aria-live="polite">{log.slice(-6).join("\n")}</pre>
          <div className="pf-actions mg-actions">
            <button className="pf-run" onClick={copy} disabled={busy || stage === "live"}>
              {copied ? "Copy again" : "Dump & restore"}
            </button>
            <button onClick={verify} disabled={busy || copied < TABLES.length || stage === "live"}>
              Verify
            </button>
            <button
              className={allOk && stage === "verified" ? "pf-run" : ""}
              onClick={cutover}
              disabled={busy || !allOk || stage === "live"}
              title={allOk ? "" : "Locked until 12/12 tables verify"}
            >
              {allOk ? "Cut over" : `Cut over 🔒`}
            </button>
            {stage === "live" && <button onClick={rollback}>Rollback</button>}
            <button onClick={reset} disabled={busy}>
              Reset
            </button>
          </div>
          {bad.length > 0 && stage === "verified" && (
            <p className="mg-hint">
              {bad.join(" and ")} changed during the copy. {frozen ? "Writes are frozen now, so re-sync them." : "Freeze writes, then re-sync."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
