-- ============================================================
-- G-VITRINE SAAS SECURITY
-- Mantém o lead da loja legada e separa inserts/arquivos das lojas SaaS.
-- ============================================================

-- O policy legado permissivo permitiria inserir lead em qualquer tenant.
drop policy if exists "Qualquer um pode enviar contato" on public.leads;
drop policy if exists "SaaS lead insert for active stores" on public.leads;

create policy "Legacy and active SaaS lead inserts"
  on public.leads
  for insert
  to anon, authenticated
  with check (
    organization_id is null
    or public.is_organization_active(organization_id)
  );

-- Uploads SaaS no bucket loja usam organization_id como primeiro segmento:
-- <organization_id>/<pasta>/<arquivo>.
drop policy if exists "SaaS members manage own loja files" on storage.objects;

create policy "SaaS members manage own loja files"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'loja'
    and public.is_organization_member(
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
  with check (
    bucket_id = 'loja'
    and public.is_organization_member(
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
        else null
      end
    )
  );