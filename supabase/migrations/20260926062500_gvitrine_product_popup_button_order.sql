alter table public.produtos
  add column if not exists botoes_ordem text[] not null default array['comprar','video','site']::text[];

update public.produtos
set botoes_ordem = array['comprar','video','site']::text[]
where botoes_ordem is null
   or cardinality(botoes_ordem) <> 3;