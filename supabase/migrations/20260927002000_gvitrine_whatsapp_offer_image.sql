alter table public.produtos
  add column if not exists whatsapp_compartilhar_imagem_url text;

comment on column public.produtos.whatsapp_compartilhar_imagem_url is 'Imagem personalizada usada na divulgação do produto pelo WhatsApp. Vazio usa a imagem principal do produto.';