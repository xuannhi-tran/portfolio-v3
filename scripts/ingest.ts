/*
 * npm run ingest
 * Chunks content/, embeds each chunk with Voyage and replaces everything in Supabase's rag_chunks.
 * Run it again whenever you edit content/. Use --dry to only print the chunks (no keys needed).
 */
import { buildChunks } from "../lib/rag/chunks";
import { embed } from "../lib/rag/embed";
import { supabaseAdmin } from "../lib/rag/supabase";

async function main() {
  const chunks = buildChunks();
  console.log(`${chunks.length} chunks from content/`);

  if (process.argv.includes("--dry")) {
    for (const c of chunks) console.log(`\n── ${c.id}  [${c.skills.join(", ")}]\n${c.text}`);
    return;
  }

  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += 64) {
    vectors.push(...(await embed(chunks.slice(i, i + 64).map((c) => c.text), "document")));
  }

  const db = supabaseAdmin();
  const rows = chunks.map((c, i) => ({ ...c, embedding: JSON.stringify(vectors[i]), updated_at: new Date().toISOString() }));
  const { error } = await db.from("rag_chunks").upsert(rows);
  if (error) throw error;

  // remove chunks whose section no longer exists
  const ids = chunks.map((c) => `"${c.id}"`).join(",");
  const { error: delError, count } = await db.from("rag_chunks").delete({ count: "exact" }).not("id", "in", `(${ids})`);
  if (delError) throw delError;

  console.log(`Upserted ${rows.length} chunks, removed ${count ?? 0} stale ones.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
