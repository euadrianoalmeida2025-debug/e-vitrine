-- Public product resolution for tenant URLs.
-- Uses the store slug + product slug exactly as they appear in:
-- /loja/{storeSlug}/produto/{productSlug}
create or replace function public.public_produto_por_loja(
  _organization_slug text,
  _product_slug text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select to_jsonb(p)
    from public.produtos p
    join public.organizations o
      on o.id = p.organization_id
   where o.slug = _organization_slug
     and o.status = 'active'
     and p.slug = _product_slug
     and p.ativo = true
   limit 1;
$fn$;

revoke execute on function public.public_produto_por_loja(text,text) from public;
grant execute on function public.public_produto_por_loja(text,text) to anon, authenticated, service_role;