alter table public.leads
  add column if not exists status text,
  add column if not exists source text,
  add column if not exists page_url text;