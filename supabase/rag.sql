-- Ask Nhi: run this once in Supabase → SQL Editor.
-- Safe to run again: everything is "if not exists" / "or replace".

create extension if not exists vector;

-- One row per chunk of content/ (see lib/rag/chunks.ts). Filled by `npm run ingest`.
create table if not exists rag_chunks (
  id         text primary key,          -- "jobcompass#results"
  source     text not null,             -- graph node id, or "profile" / "faq"
  title      text not null,
  heading    text not null,
  text       text not null,
  skills     text[] not null default '{}',
  embedding  vector(1024) not null,     -- voyage-3.5
  updated_at timestamptz not null default now()
);

-- Only the server (secret key) reads or writes. No policies means the public anon key gets nothing.
alter table rag_chunks enable row level security;

-- Top-k chunks by cosine similarity (1 = same direction, 0 = unrelated).
create or replace function match_chunks(query_embedding vector(1024), match_count int default 6)
returns table (id text, source text, title text, heading text, text text, skills text[], similarity float)
language sql stable
as $$
  select c.id, c.source, c.title, c.heading, c.text, c.skills,
         1 - (c.embedding <=> query_embedding) as similarity
  from rag_chunks c
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Usage counters, so nobody can burn through the API credit.
create table if not exists ask_usage (
  bucket     text primary key,          -- "ip:<sha256>:2026-11-10T02" or "day:2026-11-10"
  count      int not null default 0,
  expires_at timestamptz not null
);
alter table ask_usage enable row level security;

-- Counts one question. Returns 'ok', 'ip' (this visitor hit the hourly limit) or 'day' (site-wide daily cap).
create or replace function bump_usage(ip_hash text, per_ip_hour int, per_day int)
returns text
language plpgsql
as $$
declare
  ip_bucket  text := 'ip:' || ip_hash || ':' || to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24');
  day_bucket text := 'day:' || to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  n int;
begin
  delete from ask_usage where expires_at < now();

  select count into n from ask_usage where bucket = day_bucket;
  if coalesce(n, 0) >= per_day then return 'day'; end if;

  select count into n from ask_usage where bucket = ip_bucket;
  if coalesce(n, 0) >= per_ip_hour then return 'ip'; end if;

  insert into ask_usage (bucket, count, expires_at) values (day_bucket, 1, now() + interval '2 days')
    on conflict (bucket) do update set count = ask_usage.count + 1;
  insert into ask_usage (bucket, count, expires_at) values (ip_bucket, 1, now() + interval '2 hours')
    on conflict (bucket) do update set count = ask_usage.count + 1;
  return 'ok';
end;
$$;

-- Keep these callable only with the secret key.
revoke execute on function match_chunks(vector, int) from public, anon, authenticated;
revoke execute on function bump_usage(text, int, int) from public, anon, authenticated;
