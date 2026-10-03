alter table public.produtos
  add column if not exists whatsapp_compartilhar_titulo text,
  add column if not exists whatsapp_compartilhar_descricao text;

comment on column public.produtos.whatsapp_compartilhar_titulo is 'Título personalizado usado na divulgação do produto pelo WhatsApp. Vazio usa o título do produto.';
comment on column public.produtos.whatsapp_compartilhar_descricao is 'Descrição personalizada usada na divulgação do produto pelo WhatsApp. Vazio usa a descrição do produto.';