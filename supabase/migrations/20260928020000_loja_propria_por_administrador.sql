-- ============================================================
-- G-VITRINE: UMA LOJA PRÓPRIA PARA CADA NOVO ADMINISTRADOR
-- Cada novo cadastro recebe uma loja independente já inicializada
-- com a mesma estrutura/dados-base da loja G-Vitrine legada.
--
-- Dados legados permanecem com organization_id = NULL.
-- Leads não são clonados.
-- ============================================================

create or replace function public.initialize_organization_from_legacy(_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  _has_categories boolean;
  _has_products boolean;
  _category_map jsonb := '{}'::jsonb;
  _legacy_category record;
  _new_category_id uuid;
begin
  if not exists (
    select 1
      from public.organizations
     where id = _organization_id
       and status = 'active'
  ) then
    return;
  end if;

  -- A carga inicial de categorias/produtos acontece somente quando
  -- a loja ainda está vazia. Isso evita sobrescrever lojas já usadas.
  select exists (
    select 1 from public.categorias
     where organization_id = _organization_id
  ) into _has_categories;

  select exists (
    select 1 from public.produtos
     where organization_id = _organization_id
  ) into _has_products;

  if not _has_categories and not _has_products then
    for _legacy_category in
      select *
        from public.categorias
       where organization_id is null
       order by ordem asc, nome asc
    loop
      insert into public.categorias (
        id, nome, slug, ordem, created_at, updated_at, organization_id
      )
      values (
        gen_random_uuid(),
        _legacy_category.nome,
        _legacy_category.slug,
        _legacy_category.ordem,
        _legacy_category.created_at,
        _legacy_category.updated_at,
        _organization_id
      )
      returning id into _new_category_id;

      _category_map := _category_map
        || jsonb_build_object(_legacy_category.id::text, _new_category_id::text);
    end loop;

    insert into public.produtos
    select (
      jsonb_populate_record(
        null::public.produtos,
        (
          (to_jsonb(p) - 'id' - 'organization_id')
          || jsonb_build_object(
            'id', gen_random_uuid(),
            'organization_id', _organization_id,
            'categoria_id',
              case
                when p.categoria_id is null then null
                when (_category_map ->> p.categoria_id::text) is null then null
                else (_category_map ->> p.categoria_id::text)::uuid
              end
          )
        )
      )
    ).*
    from public.produtos p
    where p.organization_id is null;
  end if;

  -- Configurações da vitrine/admin entram como um snapshot dos valores
  -- atuais da loja G-Vitrine. Chaves já existentes no tenant são mantidas.
  insert into public.configuracoes
  select (
    jsonb_populate_record(
      null::public.configuracoes,
      (
        (to_jsonb(c) - 'id' - 'organization_id')
        || jsonb_build_object(
          'id', gen_random_uuid(),
          'organization_id', _organization_id
        )
      )
    )
  ).*
  from public.configuracoes c
  where c.organization_id is null
    and not exists (
      select 1
        from public.configuracoes existing
       where existing.organization_id = _organization_id
         and existing.chave = c.chave
    );

  -- Se no futuro a loja legada tiver banners cadastrados, o novo
  -- administrador também recebe um snapshot inicial deles.
  if not exists (
    select 1 from public.banners where organization_id = _organization_id
  ) then
    insert into public.banners
    select (
      jsonb_populate_record(
        null::public.banners,
        (
          (to_jsonb(b) - 'id' - 'organization_id')
          || jsonb_build_object(
            'id', gen_random_uuid(),
            'organization_id', _organization_id
          )
        )
      )
    ).*
    from public.banners b
    where b.organization_id is null;
  end if;
end;
$fn$;

revoke execute on function public.initialize_organization_from_legacy(uuid) from public, anon;
grant execute on function public.initialize_organization_from_legacy(uuid) to authenticated, service_role;

create or replace function public.organizations_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  insert into public.organization_subscriptions (organization_id, plan_code, status)
  values (new.id, 'free', 'active')
  on conflict (organization_id) do nothing;

  perform public.initialize_organization_from_legacy(new.id);

  return new;
end;
$fn$;

drop trigger if exists organizations_after_insert_trigger on public.organizations;
create trigger organizations_after_insert_trigger
after insert on public.organizations
for each row execute function public.organizations_after_insert();

-- Inicializa as lojas já criadas pelo protótipo anterior, sem apagar
-- nada que cada uma já tenha personalizado.
do $$
declare
  _organization record;
begin
  for _organization in
    select id
      from public.organizations
     where status = 'active'
  loop
    perform public.initialize_organization_from_legacy(_organization.id);
  end loop;
end $$;