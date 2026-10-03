# e-vitrine — Loja Digital

Projeto importado do Lovable e integrado ao Supabase KI VITRINE (jgghorujqsnrkhyzknvx).

## Supabase

- URL: https://jgghorujqsnrkhyzknvx.supabase.co
- Banco: PostgreSQL 17
- Região: sa-east-1
- Schema e migrations da loja aplicados no projeto Supabase.
- O código usa a chave publishable pública apenas no cliente; chaves de serviço devem permanecer em variáveis de ambiente do servidor.

## Desenvolvimento

Defina, quando necessário:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (somente servidor)

O cliente possui fallback para a URL e a publishable key pública do projeto KI VITRINE.

## Banco

As migrations originais estão em supabase/migrations/. Migrations duplicadas/redundantes foram preservadas no repositório para manter o histórico do projeto; no banco de destino foram aplicadas somente as etapas necessárias, evitando políticas duplicadas.

## Fonte

Projeto original: Product Data Fetcher / LOJA DIGITAL no Lovable.
