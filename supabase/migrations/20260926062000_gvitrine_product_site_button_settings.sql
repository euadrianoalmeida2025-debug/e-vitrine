alter table public.produtos
  add column if not exists site_texto text not null default 'Ver Site',
  add column if not exists site_cor text not null default '#16a34a',
  add column if not exists site_ativo boolean not null default true;

update public.produtos
set
  site_texto = coalesce(nullif(btrim(site_texto), ''), 'Ver Site'),
  site_cor = coalesce(nullif(btrim(site_cor), ''), '#16a34a'),
  site_ativo = coalesce(site_ativo, true);

create index if not exists produtos_site_ativo_idx
  on public.produtos(site_ativo)
  where site_ativo = true;