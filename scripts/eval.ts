/*
 * npm run eval
 * Runs every case in content/rag/eval-questions.json through the same retrieval and model call
 * as /api/ask, checks the answer, and writes content/rag/eval-results.json for the "How it's built" page.
 * Cost: one Voyage call and at most one Claude call per case (12 cases on Haiku 5.5 ≈ a fraction of a cent).
 *
 * Checks per case:
 *   expect_sources  every listed source is cited in the answer
 *   must_mention    every phrase appears in the answer (case-insensitive)
 *   must_not_mention  none of these phrases appear (e.g. pronouns for Nhi)
 *   refuse          the answer declines and cites nothing
 */
import fs from "node:fs";
import path from "node:path";
import { MODEL, retrieve, streamAnswer } from "../lib/rag/answer";
import { supabaseAdmin } from "../lib/rag/supabase";

type Case = { q: string; expect_sources?: string[]; must_mention?: string[]; must_not_mention?: string[]; refuse?: boolean };

const file = path.join(process.cwd(), "content/rag/eval-questions.json");
const { cases } = JSON.parse(fs.readFileSync(file, "utf8")) as { cases: Case[] };
const DECLINE = /\b(don't know|do not know|can't|cannot|can only|not able|unable|only answer|isn't something|not something)\b/i;

async function main() {
  const db = supabaseAdmin();
  const results = [];
  for (const c of cases) {
    const t0 = Date.now();
    const sources = await retrieve(db, c.q);
    let answer = "I don't know.";
    if (sources.length) {
      const msg = await streamAnswer(c.q, sources).finalMessage();
      answer = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      if (msg.stop_reason === "refusal") answer = "[refused]";
    }
    const citedNs = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    const cited = [...new Set(sources.filter((_, i) => citedNs.has(i + 1)).map((s) => s.source))];

    const fails: string[] = [];
    for (const s of c.expect_sources ?? []) if (!cited.includes(s)) fails.push(`missing source ${s}`);
    for (const m of c.must_mention ?? []) if (!answer.toLowerCase().includes(m.toLowerCase())) fails.push(`missing "${m}"`);
    for (const m of c.must_not_mention ?? []) if (` ${answer.toLowerCase()} `.includes(m.toLowerCase())) fails.push(`should not say "${m.trim()}"`);
    if (c.refuse && !(DECLINE.test(answer) || answer === "[refused]")) fails.push("did not decline");
    if (c.expect_sources?.length === 0 && cited.length) fails.push(`cited ${cited.join(", ")} for an unanswerable question`);

    const pass = fails.length === 0;
    results.push({ q: c.q, pass, fails, cited, retrieved: sources.map((s) => `${s.id} ${s.similarity.toFixed(2)}`), answer, ms: Date.now() - t0 });
    console.log(`${pass ? "PASS" : "FAIL"}  ${c.q}${pass ? "" : `\n      ${fails.join("; ")}\n      → ${answer.replace(/\n/g, " ")}`}`);
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} passed with ${MODEL}`);
  fs.writeFileSync(
    path.join(process.cwd(), "content/rag/eval-results.json"),
    JSON.stringify({ model: MODEL, ran_at: new Date().toISOString(), passed, total: results.length, results }, null, 2) + "\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
