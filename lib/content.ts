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
