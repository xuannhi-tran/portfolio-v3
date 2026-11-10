import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { retrieve, streamAnswer } from "@/lib/rag/answer";
import { supabaseAdmin, type Match } from "@/lib/rag/supabase";

/*
 * POST /api/ask  { question: string }
 * Streams newline-delimited JSON events:
 *   { type: "sources", sources: [...] }   the chunks retrieved for this question
 *   { type: "text", text }                answer tokens, with [n] citations
 *   { type: "done" } | { type: "error", message }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION = 300; // characters
const PER_IP_HOUR = Number(process.env.ASK_PER_IP_HOUR || 10);
const PER_DAY = Number(process.env.ASK_PER_DAY || 300);

const IDK = "I don't know that one: my sources don't cover it. Try asking about Nhi's projects, skills or experience, or reach out on LinkedIn.";

type Event =
  | { type: "sources"; sources: (Omit<Match, "text"> & { n: number })[] }
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

function line(e: Event) {
  return new TextEncoder().encode(JSON.stringify(e) + "\n");
}

function ipHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  // hashed so raw IP addresses are never stored
  return createHash("sha256").update(ip + (process.env.SUPABASE_URL ?? "")).digest("hex").slice(0, 32);
}

function json(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let question: string;
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return json(400, "Send JSON like { \"question\": \"…\" }.");
  }
  if (!question) return json(400, "Ask a question first.");
  if (question.length > MAX_QUESTION) return json(400, `Keep questions under ${MAX_QUESTION} characters.`);

  let db: ReturnType<typeof supabaseAdmin>;
  try {
    db = supabaseAdmin();
  } catch (e) {
    console.error(e);
    return json(503, "Ask Nhi isn't set up yet. Please check back soon.");
  }

  // 1. spend guard: per-visitor hourly limit and a site-wide daily cap, counted in Supabase
  const { data: usage, error: usageError } = await db.rpc("bump_usage", { ip_hash: ipHash(req), per_ip_hour: PER_IP_HOUR, per_day: PER_DAY });
  if (usageError) {
    console.error("bump_usage failed", usageError);
    return json(503, "The chatbot is unavailable right now. Please try again later.");
  }
  if (usage === "ip") return json(429, `That's ${PER_IP_HOUR} questions this hour. Please try again a bit later.`);
  if (usage === "day") return json(429, "Ask Nhi has answered all it can for today. Please come back tomorrow, or reach out on LinkedIn.");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(line(e));
      try {
        // 2. retrieve
        const sources = await retrieve(db, question);
        send({ type: "sources", sources: sources.map(({ text: _text, ...m }, i) => ({ ...m, n: i + 1 })) });

        // nothing relevant: say so without spending a model call
        if (sources.length === 0) {
          send({ type: "text", text: IDK });
          send({ type: "done" });
          return;
        }

        // 3. generate, grounded in the retrieved sources
        const answer = streamAnswer(question, sources, req.signal);
        answer.on("text", (text) => send({ type: "text", text }));
        const final = await answer.finalMessage();
        if (final.stop_reason === "refusal") send({ type: "text", text: "\n\nI can't help with that one. Ask me about Nhi's projects or experience instead." });
        send({ type: "done" });
      } catch (e) {
        if (req.signal.aborted) return;
        console.error("ask failed", e);
        const message =
          e instanceof Anthropic.RateLimitError
            ? "Ask Nhi is busy right now. Please try again in a minute."
            : "Something went wrong while answering. Please try again.";
        send({ type: "error", message });
      } finally {
        try {
          controller.close();
        } catch {
          /* client already went away */
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
