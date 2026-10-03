-- ============================================================
-- G-VITRINE SAAS / MULTI-TENANT
-- ============================================================

create table if not exists public.saas_plans (
  code text primary key,
  name text not null,
  description text not null default '',
  price_monthly numeric(10,2) not null default 0,
  max_products integer not null default 20,
  max_leads integer not null default 100,
  max_members integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.saas_plans (code, name, description, price_monthly, max_products, max_leads, max_members)
values
  ('free', 'Grátis', 'Para começar sua loja digital.', 0, 20, 100, 1),
  ('pro', 'Profissional', 'Mais produtos, leads e equipe.', 49.90, 250, 5000, 5),
  ('agency', 'Agência', 'Para operação com equipe e múltiplas lojas.', 149.90, 1000, 25000, 25)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  max_products = excluded.max_products,
  max_leads = excluded.max_leads,
  max_members = excluded.max_members,
  active = true,
  updated_at = now();

alter table public.saas_plans enable row level security;
grant select on public.saas_plans to anon, authenticated;
grant all on public.saas_plans to service_role;

drop policy if exists "SaaS plans are public" on public.saas_plans;
create policy "SaaS plans are public"
  on public.saas_plans for select
  to anon, authenticated
  using (active = true);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_url text,
  primary_color text not null default '#16a34a',
  custom_domain text,
  status text not null default 'active' check (status in ('active', 'suspended', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_owner_user_idx on public.organizations(owner_user_id);
create index if not exists organizations_status_idx on public.organizations(status);

alter table public.organizations enable row level security;
grant select on public.organizations to anon, authenticated;
grant insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists organization_members_org_idx on public.organization_members(organization_id);

alter table public.organization_members enable row level security;
grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organization_members to service_role;

create or replace function public.is_organization_member(_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
      from public.organization_members
     where organization_id = _organization_id
       and user_id = auth.uid()
  );
$fn$;

create or replace function public.is_organization_admin(_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
      from public.organization_members
     where organization_id = _organization_id
       and user_id = auth.uid()
       and role in ('owner', 'admin')
  );
$fn$;

create or replace function public.is_organization_active(_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.organizations
    where id = _organization_id
      and status = 'active'
  );
$fn$;

revoke execute on function public.is_organization_member(uuid) from public, anon;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;

revoke execute on function public.is_organization_admin(uuid) from public, anon;
grant execute on function public.is_organization_admin(uuid) to authenticated, service_role;

revoke execute on function public.is_organization_active(uuid) from public, anon;
grant execute on function public.is_organization_active(uuid) to authenticated, service_role;

drop policy if exists "Active organizations are public" on public.organizations;
create policy "Active organizations are public"
  on public.organizations for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "Users can create their own organization" on public.organizations;
create policy "Users can create their own organization"
  on public.organizations for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "Organization owners and admins can update" on public.organizations;
create policy "Organization owners and admins can update"
  on public.organizations for update
  to authenticated
  using (owner_user_id = auth.uid() or public.is_organization_admin(id))
  with check (owner_user_id = auth.uid() or public.is_organization_admin(id));

drop policy if exists "Organization owners can delete" on public.organizations;
create policy "Organization owners can delete"
  on public.organizations for delete
  to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "Members can view organization members" on public.organization_members;
create policy "Members can view organization members"
  on public.organization_members for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Organization admins can manage members" on public.organization_members;
create policy "Organization admins can manage members"
  on public.organization_members for all
  to authenticated
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_code text not null default 'free' references public.saas_plans(code),
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  external_customer_id text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_subscriptions enable row level security;
grant select on public.organization_subscriptions to authenticated;
grant all on public.organization_subscriptions to service_role;

drop policy if exists "Members can view their subscription" on public.organization_subscriptions;
create policy "Members can view their subscription"
  on public.organization_subscriptions for select
  to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.organizations_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  insert into public.organization_subscriptions (organization_id, plan_code, status)
  values (new.id, 'free', 'active')
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists organizations_after_insert_trigger on public.organizations;
create trigger organizations_after_insert_trigger
after insert on public.organizations
for each row execute function public.organizations_after_insert();

create or replace function public.organizations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_updated_at_trigger on public.organizations;
create trigger organizations_updated_at_trigger
before update on public.organizations
for each row execute function public.organizations_updated_at();

alter table public.produtos add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.categorias add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.configuracoes add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.leads add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists produtos_organization_idx on public.produtos(organization_id);
create index if not exists categorias_organization_idx on public.categorias(organization_id);
create index if not exists configuracoes_organization_idx on public.configuracoes(organization_id);
create index if not exists leads_organization_idx on public.leads(organization_id);

alter table public.categorias drop constraint if exists categorias_slug_key;
create unique index if not exists categorias_org_slug_uidx
  on public.categorias (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

alter table public.produtos drop constraint if exists produtos_slug_key;
create unique index if not exists produtos_org_slug_uidx
  on public.produtos (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

alter table public.configuracoes drop constraint if exists configuracoes_chave_key;
create unique index if not exists configuracoes_org_chave_uidx
  on public.configuracoes (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), chave);

create or replace function public.produtos_set_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base text;
  candidato text;
  i int := 1;
begin
  if new.slug is null or new.slug = '' then
    base := public.slugify(coalesce(new.titulo, 'produto'));
    if base = '' then base := 'produto'; end if;
    candidato := base;

    while exists (
      select 1
      from public.produtos p
      where p.slug = candidato
        and p.id <> new.id
        and p.organization_id is not distinct from new.organization_id
    ) loop
      i := i + 1;
      candidato := base || '-' || i;
    end loop;

    new.slug := candidato;
  end if;
  return new;
end;
$$;

drop policy if exists "SaaS members manage products" on public.produtos;
create policy "SaaS members manage products"
  on public.produtos for all
  to authenticated
  using (organization_id is not null and public.is_organization_member(organization_id))
  with check (organization_id is not null and public.is_organization_member(organization_id));

drop policy if exists "SaaS members manage categories" on public.categorias;
create policy "SaaS members manage categories"
  on public.categorias for all
  to authenticated
  using (organization_id is not null and public.is_organization_member(organization_id))
  with check (organization_id is not null and public.is_organization_member(organization_id));

drop policy if exists "SaaS members manage settings" on public.configuracoes;
create policy "SaaS members manage settings"
  on public.configuracoes for all
  to authenticated
  using (organization_id is not null and public.is_organization_member(organization_id))
  with check (organization_id is not null and public.is_organization_member(organization_id));

drop policy if exists "SaaS members view and delete leads" on public.leads;
create policy "SaaS members view and delete leads"
  on public.leads for select
  to authenticated
  using (organization_id is not null and public.is_organization_member(organization_id));

drop policy if exists "SaaS members delete leads" on public.leads;
create policy "SaaS members delete leads"
  on public.leads for delete
  to authenticated
  using (organization_id is not null and public.is_organization_member(organization_id));

drop policy if exists "SaaS lead insert for active stores" on public.leads;
create policy "SaaS lead insert for active stores"
  on public.leads for insert
  to anon, authenticated
  with check (
    organization_id is null
    or public.is_organization_active(organization_id)
  );

do $$
begin
  if to_regclass('public.banners') is not null then
    execute 'create index if not exists banners_organization_idx on public.banners(organization_id)';
    execute 'drop policy if exists "SaaS members manage banners" on public.banners';
    execute 'create policy "SaaS members manage banners" on public.banners for all to authenticated using (organization_id is not null and public.is_organization_member(organization_id)) with check (organization_id is not null and public.is_organization_member(organization_id))';
  end if;
end $$;

create or replace function public.saas_usage(_organization_id uuid)
returns table (
  products_count bigint,
  leads_count bigint,
  members_count bigint,
  max_products integer,
  max_leads integer,
  max_members integer,
  plan_code text,
  plan_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.produtos p where p.organization_id = _organization_id),
    (select count(*) from public.leads l where l.organization_id = _organization_id),
    (select count(*) from public.organization_members m where m.organization_id = _organization_id),
    p.max_products,
    p.max_leads,
    p.max_members,
    p.code,
    p.name
  from public.organization_subscriptions s
  join public.saas_plans p on p.code = s.plan_code
  where s.organization_id = _organization_id;
$$;

revoke execute on function public.saas_usage(uuid) from public, anon;
grant execute on function public.saas_usage(uuid) to authenticated, service_role;