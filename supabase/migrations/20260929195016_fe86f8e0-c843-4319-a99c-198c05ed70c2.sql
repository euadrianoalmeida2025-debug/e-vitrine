-- Site link is stored per product. The Ver Site button uses only this field.
alter table public.produtos
  add column if not exists site_url text;

create index if not exists produtos_site_url_idx on public.produtos(site_url)
where site_url is not null and btrim(site_url) <> '';

-- The old global site configuration is no longer used.
delete from public.configuracoes
where chave = 'produto_site';

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

alter table public.produtos
  add column if not exists botoes_ordem text[] not null default array['comprar','video','site']::text[];

update public.produtos
set botoes_ordem = array['comprar','video','site']::text[]
where botoes_ordem is null
   or cardinality(botoes_ordem) <> 3;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS whatsapp_compartilhar_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_compartilhar_cor text NOT NULL DEFAULT '#25D366',
  ADD COLUMN IF NOT EXISTS whatsapp_compartilhar_texto text NOT NULL DEFAULT 'Compartilhar no WhatsApp',
  ADD COLUMN IF NOT EXISTS whatsapp_compartilhar_url text;

ALTER TABLE public.produtos
  ALTER COLUMN botoes_ordem SET DEFAULT ARRAY['comprar','video','site','whatsapp']::text[];

UPDATE public.produtos
SET botoes_ordem = CASE
  WHEN botoes_ordem IS NULL OR array_length(botoes_ordem, 1) IS NULL
    THEN ARRAY['comprar','video','site','whatsapp']::text[]
  WHEN NOT ('whatsapp' = ANY(botoes_ordem))
    THEN array_append(botoes_ordem, 'whatsapp')
  ELSE botoes_ordem
END;

alter table public.produtos
  add column if not exists whatsapp_compartilhar_titulo text,
  add column if not exists whatsapp_compartilhar_descricao text;

comment on column public.produtos.whatsapp_compartilhar_titulo is 'Título personalizado usado na divulgação do produto pelo WhatsApp. Vazio usa o título do produto.';
comment on column public.produtos.whatsapp_compartilhar_descricao is 'Descrição personalizada usada na divulgação do produto pelo WhatsApp. Vazio usa a descrição do produto.';

-- Remove a legacy invalid WhatsApp link so the product-specific route is used dynamically.
update public.produtos
set whatsapp_compartilhar_url = null,
    updated_at = now()
where whatsapp_compartilhar_url = 'https://gvitrine.vercel.app/Agenda-PRO';

alter table public.produtos
  add column if not exists whatsapp_compartilhar_imagem_url text;

comment on column public.produtos.whatsapp_compartilhar_imagem_url is 'Imagem personalizada usada na divulgação do produto pelo WhatsApp. Vazio usa a imagem principal do produto.';