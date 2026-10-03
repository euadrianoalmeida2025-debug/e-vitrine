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