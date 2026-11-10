import Anthropic from "@anthropic-ai/sdk";
import { embed } from "./embed";
import { SYSTEM_PROMPT, userMessage } from "./prompt";
import type { Match } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Retrieval and generation, shared by /api/ask and scripts/eval.ts. */

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
export const TOP_K = 6;
export const MIN_SIMILARITY = Number(process.env.RAG_MIN_SIMILARITY || 0.3); // below this a chunk isn't relevant

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic()); // reads ANTHROPIC_API_KEY

/** Embed the question and return the relevant chunks, best first. */
export async function retrieve(db: SupabaseClient, question: string): Promise<Match[]> {
  const [vector] = await embed([question], "query");
  const { data, error } = await db.rpc("match_chunks", { query_embedding: JSON.stringify(vector), match_count: TOP_K });
  if (error) throw error;
  return ((data ?? []) as Match[]).filter((m) => m.similarity >= MIN_SIMILARITY);
}

/** Stream Claude's answer, grounded in the retrieved sources. */
export function streamAnswer(question: string, sources: Match[], signal?: AbortSignal) {
  const haiku = MODEL.includes("haiku");
  return anthropic().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: haiku ? 600 : 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage(question, sources) }],
      output_config: { effort: "low" },
      // Haiku can skip thinking for short factual answers; Opus 5.5 always thinks, so it gets more room.
      // Server-side fallback re-runs a declined request on another model (not available for Haiku).
      ...(haiku ? { thinking: { type: "disabled" as const } } : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
    },
    { signal },
  );
}
