import { supabaseAdmin } from "@/lib/rag/supabase";

/*
 * GET /api/keepalive, called once a day by Vercel Cron (see vercel.json).
 * Free Supabase projects pause after 7 days without activity, which would take Ask Nhi down.
 * One tiny read keeps the project awake. No Claude or Voyage calls, so it costs nothing.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { count, error } = await supabaseAdmin().from("rag_chunks").select("id", { count: "exact", head: true });
    if (error) throw error;
    return Response.json({ ok: true, chunks: count });
  } catch (e) {
    console.error("keepalive failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
