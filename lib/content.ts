import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const CONTENT = path.join(process.cwd(), "content");

export type Figure = { id: string; idea: string; disclaimer?: string };

export type Project = {
  id: string;
  type: "project" | "experience";
  title: string;
  subtitle?: string;
  tagline?: string;
  summary?: string;
  org?: string;
  location?: string;
  period: string;
  order: number;
  stack: string[];
  skills: string[];
  links: { live?: string | null; repo?: string | null };
  figure?: Figure;
  html: string;
  /** Bullets from the "What I built / What I did" section, as inline HTML. */
  highlights: string[];
};

export type Item = { title: string; sub?: string; note?: string };
export type Profile = {
  name: string;
  preferred_name: string;
  location: string;
  looking_for: string;
  links: Record<string, string>;
  facts: { label: string; value: string; sub?: string }[];
  education: Item[];
  recognition: Item[];
  toolkit: Item[];
  html: string;
};

export type GraphNode = { id: string; label: string; kind: "profile" | "project" | "experience" | "skill"; href?: string; group?: string };
export type Graph = { nodes: GraphNode[]; edges: { source: string; target: string }[] };

/** Drop <!-- TODO --> comments so unfinished notes never reach the page. */
function clean(md: string) {
  return md.replace(/<!--[\s\S]*?-->/g, "").replace(/\n{3,}/g, "\n\n");
}

/** Remove sections that are empty once TODO comments are gone. */
function dropEmptySections(md: string) {
  return md
    .split(/(?=^## )/m)
    .filter((part) => !part.startsWith("## ") || part.split("\n").filter((l) => l.trim()).length > 1)
    .join("");
}

/** List items under the first "## What I…" heading. */
function highlights(md: string): string[] {
  const tokens = marked.lexer(clean(md));
  const i = tokens.findIndex((t) => t.type === "heading" && t.depth === 2 && /^what i/i.test(t.text));
  if (i < 0) return [];
  const list = tokens.slice(i + 1).find((t) => t.type === "list" || (t.type === "heading" && t.depth <= 2));
  if (!list || list.type !== "list") return [];
  return (list as { items: { text: string }[] }).items.map((it) => marked.parseInline(it.text, { async: false }) as string);
}

function render(md: string) {
  return marked.parse(dropEmptySections(clean(md)), { async: false }) as string;
}

export function getProjects(): Project[] {
  const dir = path.join(CONTENT, "projects");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      // the H1 is shown by the page header, so strip it from the body
      const body = content.replace(/^# .*\n/m, "");
      const fm = data as Omit<Project, "html">;
      return {
        ...fm,
        stack: fm.stack ?? [],
        skills: fm.skills ?? [],
        links: fm.links ?? {},
        html: render(body),
        highlights: highlights(body),
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function getProfile(): Profile {
  const { data, content } = matter(fs.readFileSync(path.join(CONTENT, "profile.md"), "utf8"));
  const fm = data as Omit<Profile, "html">;
  return {
    ...fm,
    facts: fm.facts ?? [],
    education: fm.education ?? [],
    recognition: fm.recognition ?? [],
    toolkit: fm.toolkit ?? [],
    html: render(content.replace(/^# .*\n/m, "")),
  };
}

export function getGraph(): Graph {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, "graph.json"), "utf8"));
}

/* ---------- timeline ---------- */

export type TimelineRow = {
  id: string;
  tag: "WORK" | "PROJECT" | "HACKATHON" | "STUDY";
  org: string;
  role: string;
  period: string;
  start: number; // months since year 0
  end: number | null; // null = ongoing
  href?: string;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Oct 2026" -> month index; "2024" -> January of that year. */
function parseMonth(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (t === "present" || t === "now") return null;
  const m = t.match(/^(?:([a-z]{3})[a-z]*\s+)?(\d{4})$/);
  if (!m) throw new Error(`Can't parse date "${s}"`);
  const month = m[1] ? MONTHS.indexOf(m[1]) : 0;
  return Number(m[2]) * 12 + Math.max(month, 0);
}

function parsePeriod(period: string) {
  const [a, b] = period.split(/\s+[–-]\s+/);
  const start = parseMonth(a);
  if (start === null) throw new Error(`Bad start in "${period}"`);
  return { start, end: b ? parseMonth(b) : start };
}

export function monthNow() {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
}

export function getTimeline(): TimelineRow[] {
  const fromProjects: TimelineRow[] = getProjects().map((p) => ({
    id: p.id,
    tag: p.type === "experience" ? "WORK" : /hackathon/i.test(p.subtitle ?? "") ? "HACKATHON" : "PROJECT",
    org: p.type === "experience" ? (p.org ?? p.title) : p.title,
    role: p.type === "experience" ? p.title : (p.subtitle ?? ""),
    period: p.period,
    href: `/work/${p.id}`,
    ...parsePeriod(p.period),
  }));
  const file = path.join(CONTENT, "timeline.md");
  const extra = fs.existsSync(file)
    ? ((matter(fs.readFileSync(file, "utf8")).data.items ?? []) as Omit<TimelineRow, "start" | "end">[]).map((r) => ({
        ...r,
        ...parsePeriod(r.period),
      }))
    : [];
  // ongoing first, then most recent end, then most recent start
  const key = (r: TimelineRow) => (r.end ?? Infinity);
  return [...fromProjects, ...extra].sort((a, b) => key(b) - key(a) || b.start - a.start);
}
