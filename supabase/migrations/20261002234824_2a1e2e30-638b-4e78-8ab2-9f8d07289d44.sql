drop policy if exists "Qualquer um pode enviar contato" on public.leads;
drop policy if exists "SaaS lead insert for active stores" on public.leads;
drop policy if exists "public_insert_leads" on public.leads;
drop policy if exists "Legacy and active SaaS lead inserts" on public.leads;
create policy "Legacy and active SaaS lead inserts"
  on public.leads for insert to anon, authenticated
  with check (organization_id is null or public.is_organization_active(organization_id));

drop policy if exists "SaaS members manage own loja files" on storage.objects;
create policy "SaaS members manage own loja files"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'loja'
    and public.is_organization_member(
      case when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid else null end))
  with check (
    bucket_id = 'loja'
    and public.is_organization_member(
      case when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid else null end));

create or replace function public.initialize_organization_from_legacy(_organization_id uuid)
returns void language plpgsql security definer set search_path = public
as $fn$
declare
  _category_map jsonb := '{}'::jsonb;
  _legacy_category record;
  _new_category_id uuid;
begin
  if not exists (select 1 from public.organizations where id = _organization_id and status = 'active') then
    return;
  end if;

  if not exists (select 1 from public.categorias where organization_id = _organization_id)
     and not exists (select 1 from public.produtos where organization_id = _organization_id) then
    for _legacy_category in
      select * from public.categorias where organization_id is null order by ordem asc, nome asc
    loop
      insert into public.categorias (id, nome, slug, ordem, created_at, updated_at, organization_id)
      values (gen_random_uuid(), _legacy_category.nome, _legacy_category.slug, _legacy_category.ordem,
              _legacy_category.created_at, _legacy_category.updated_at, _organization_id)
      returning id into _new_category_id;
      _category_map := _category_map || jsonb_build_object(_legacy_category.id::text, _new_category_id::text);
    end loop;

    insert into public.produtos
    select (jsonb_populate_record(null::public.produtos,
      ((to_jsonb(p) - 'id' - 'organization_id') || jsonb_build_object(
        'id', gen_random_uuid(),
        'organization_id', _organization_id,
        'categoria_id', case when p.categoria_id is null then null
                             when (_category_map ->> p.categoria_id::text) is null then null
                             else (_category_map ->> p.categoria_id::text)::uuid end)))).*
    from public.produtos p where p.organization_id is null;
  end if;

  insert into public.configuracoes
  select (jsonb_populate_record(null::public.configuracoes,
    ((to_jsonb(c) - 'id' - 'organization_id') || jsonb_build_object('id', gen_random_uuid(), 'organization_id', _organization_id)))).*
  from public.configuracoes c
  where c.organization_id is null
    and not exists (select 1 from public.configuracoes e where e.organization_id = _organization_id and e.chave = c.chave);
end;
$fn$;

revoke execute on function public.initialize_organization_from_legacy(uuid) from public, anon, authenticated;
grant execute on function public.initialize_organization_from_legacy(uuid) to service_role;

create or replace function public.organizations_after_insert()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner') on conflict (organization_id, user_id) do nothing;
  insert into public.organization_subscriptions (organization_id, plan_code, status)
  values (new.id, 'free', 'active') on conflict (organization_id) do nothing;
  perform public.initialize_organization_from_legacy(new.id);
  return new;
end;
$fn$;
revoke execute on function public.organizations_after_insert() from public, anon, authenticated;

drop trigger if exists organizations_after_insert_trigger on public.organizations;
create trigger organizations_after_insert_trigger
after insert on public.organizations
for each row execute function public.organizations_after_insert();

create or replace function public.public_produto_por_loja(_organization_slug text, _product_slug text)
returns jsonb language sql stable security definer set search_path = public
as $fn$
  select to_jsonb(p)
    from public.produtos p
    join public.organizations o on o.id = p.organization_id
   where o.slug = _organization_slug and o.status = 'active'
     and p.slug = _product_slug and p.ativo = true
   limit 1;
$fn$;
revoke execute on function public.public_produto_por_loja(text,text) from public;
grant execute on function public.public_produto_por_loja(text,text) to anon, authenticated, service_role;