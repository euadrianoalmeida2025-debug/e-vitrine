-- Site link is stored per product. The Ver Site button uses only this field.
alter table public.produtos
  add column if not exists site_url text;

create index if not exists produtos_site_url_idx on public.produtos(site_url)
where site_url is not null and btrim(site_url) <> '';

-- The old global site configuration is no longer used.
delete from public.configuracoes
where chave = 'produto_site';