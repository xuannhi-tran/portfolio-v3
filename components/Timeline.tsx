import Link from "next/link";
import { getTimeline, monthNow } from "@/lib/content";

const fmt = (period: string) => period.replace(/Present/i, "now");

export default function Timeline() {
  const rows = getTimeline();
  const now = monthNow();
  // Show the last 12 months so recent work isn't squashed; older bars fade in from the left edge.
  const from = Math.max(Math.min(...rows.map((r) => r.start)), now - 11);
  const span = now + 1 - from;
  const pct = (m: number) => Math.max(0, ((m - from) / span) * 100);
  // ticks every 6 months (Jan and Jul)
  const ticks: { m: number; label: string }[] = [];
  for (let m = Math.ceil(from / 6) * 6; m <= now - 2; m += 6) {
    if (m <= from) continue;
    ticks.push({ m, label: m % 12 === 0 ? String(m / 12) : `JUL ’${String(Math.floor(m / 12)).slice(2)}` });
  }

  return (
    <div className="tl" role="table" aria-label="Timeline of work, projects and study">
      <div className="tl-row tl-head" role="row">
        <span role="columnheader">Dates</span>
        <span role="columnheader">Role</span>
        <span role="columnheader" className="tl-axis" aria-hidden>
          {ticks.map((t) => (
            <i key={t.m} style={{ left: `${pct(t.m)}%` }}>{t.label}</i>
          ))}
          <i className="now" style={{ left: "100%" }}>NOW</i>
        </span>
      </div>
      {rows.map((r) => {
        const live = r.end === null;
        const end = r.end ?? now; // inclusive month
        const clipped = r.start < from;
        const body = (
          <>
            <span className="tl-dates" role="cell">{fmt(r.period)}</span>
            <span className="tl-role" role="cell">
              <em className="tl-tag">{r.tag}</em>
              <b>{r.org}</b> {r.role}
            </span>
            <span className="tl-track" role="cell" aria-hidden>
              {ticks.map((t) => (
                <i key={t.m} className="tl-grid" style={{ left: `${pct(t.m)}%` }} />
              ))}
              <i
                className={`tl-bar ${live ? "live" : ""} ${clipped ? "clipped" : ""}`}
                style={{ left: `${pct(r.start)}%`, width: `max(6px, ${pct(end + 1) - pct(r.start)}%)` }}
              />
            </span>
          </>
        );
        return r.href ? (
          <Link key={r.id} href={r.href} className="tl-row" role="row">{body}</Link>
        ) : (
          <div key={r.id} className="tl-row" role="row">{body}</div>
        );
      })}
    </div>
  );
}
