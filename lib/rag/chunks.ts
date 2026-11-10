import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/*
 * Turns content/ into the chunks the "Ask Nhi" chatbot can search.
 * Rules live in content/rag/README.md. In short: one chunk per "## " section,
 * TODO comments and figure blocks removed, and contact details never indexed.
 */

export type Chunk = {
  id: string; // "jobcompass#results"
  source: string; // node id in content/graph.json ("jobcompass"), or "profile" / "faq"
  title: string; // shown as the citation label
  heading: string;
  text: string; // what gets embedded and shown to Claude
  skills: string[]; // skill ids without the "skill:" prefix
};

const CONTENT = path.join(process.cwd(), "content");

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Markdown to plain-ish text: no TODO comments, no emphasis markers, tidy blank lines. */
function plain(md: string) {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\W)_(.+?)_(\W|$)/g, "$1$2$3")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The one email Nhi chose to publish (profile.md links.email); every other address is scrubbed. */
const PUBLIC_EMAIL = (matter(fs.readFileSync(path.join(CONTENT, "profile.md"), "utf8")).data.links?.email ?? "").toLowerCase();

/** Safety net: even if a phone number or another email slips into content, it never reaches the index. */
function scrub(text: string) {
  return text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, (m) => (PUBLIC_EMAIL && m.toLowerCase() === PUBLIC_EMAIL ? m : "[email removed]"))
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, (m) => (m.replace(/\D/g, "").length >= 8 ? "[number removed]" : m));
}

/** Split a markdown body into "## " sections, dropping ones that are empty once TODOs are gone. */
function sections(body: string) {
  return body
    .replace(/^# .*\n/m, "")
    .split(/(?=^## )/m)
    .map((part) => {
      const m = part.match(/^## (.+)\n([\s\S]*)$/);
      return m ? { heading: m[1].trim(), text: plain(m[2]) } : { heading: "Overview", text: plain(part) };
    })
    .filter((s) => s.text.length > 0);
}

type Item = { title: string; sub?: string; note?: string };
const items = (list: Item[] = []) => list.map((i) => `- ${[i.title, i.sub, i.note].filter(Boolean).join(". ")}`).join("\n");

function profileChunks(): Chunk[] {
  const { data, content } = matter(fs.readFileSync(path.join(CONTENT, "profile.md"), "utf8"));
  const who = `${data.name} (goes by ${data.preferred_name})`;
  const base = { source: "profile", title: "About Nhi", skills: [] as string[] };
  const out: Chunk[] = [
    {
      ...base,
      id: "profile#facts",
      heading: "Facts",
      text: [
        `${who} is based in ${data.location} and is looking for: ${data.looking_for}.`,
        ...(data.facts ?? []).map((f: { label: string; value: string; sub?: string }) => `${f.label}: ${f.value}${f.sub ? ` (${f.sub})` : ""}.`),
        `Contact: email is best, ${data.links?.email ?? ""}. GitHub: ${data.links?.github ?? ""}. LinkedIn: ${data.links?.linkedin ?? ""}.`,
      ].join("\n"),
    },
    { ...base, id: "profile#education", heading: "Education", text: `${who}'s education:\n${items(data.education)}` },
    { ...base, id: "profile#recognition", heading: "Recognition", text: `Awards and recognition for ${who}:\n${items(data.recognition)}` },
    { ...base, id: "profile#toolkit", heading: "Toolkit", text: `Technologies ${who} uses:\n${items(data.toolkit)}` },
  ];
  for (const s of sections(content)) {
    out.push({ ...base, id: `profile#${slug(s.heading)}`, heading: s.heading, text: s.heading === "Overview" ? `About Nhi\n${s.text}` : `${s.heading}\n${s.text}` });
  }
  return out;
}

function projectChunks(): Chunk[] {
  const dir = path.join(CONTENT, "projects");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      const kind = data.type === "experience" ? `Job: ${data.title} at ${data.org ?? ""}` : `Project: ${data.title}${data.subtitle ? ` (${data.subtitle})` : ""}`;
      // the header line gives every chunk its context, so "Results" alone still says whose results
      const stack = (data.stack ?? []).length ? ` Stack: ${data.stack.join(", ")}.` : "";
      const header = `${kind}. ${data.period}${data.location ? `, ${data.location}` : ""}.${stack}`;
      const summary: Chunk = {
        id: `${data.id}#summary`,
        source: data.id,
        title: data.title,
        heading: "Summary",
        text: `${header}\n${data.summary ?? data.tagline ?? ""}`,
        skills: data.skills ?? [],
      };
      return [
        summary,
        ...sections(content).map((s) => ({
          id: `${data.id}#${slug(s.heading)}`,
          source: data.id as string,
          title: data.title as string,
          heading: s.heading,
          text: `${header}\n${s.heading}:\n${s.text}`,
          skills: (data.skills ?? []) as string[],
        })),
      ];
    });
}

function faqChunks(): Chunk[] {
  const file = path.join(CONTENT, "rag", "faq.md");
  if (!fs.existsSync(file)) return [];
  const { content } = matter(fs.readFileSync(file, "utf8"));
  return sections(content)
    .filter((s) => s.heading !== "Overview")
    .map((s) => ({ id: `faq#${slug(s.heading)}`, source: "faq", title: "FAQ", heading: s.heading, text: `Q: ${s.heading}\nA (in Nhi's words): ${s.text}`, skills: [] }));
}

export function buildChunks(): Chunk[] {
  const all = [...profileChunks(), ...projectChunks(), ...faqChunks()].map((c) => ({ ...c, text: scrub(c.text) }));
  const seen = new Set<string>();
  for (const c of all) {
    if (seen.has(c.id)) throw new Error(`Duplicate chunk id ${c.id}`);
    seen.add(c.id);
  }
  return all;
}
