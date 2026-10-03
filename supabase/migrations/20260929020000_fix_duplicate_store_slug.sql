-- Mantém a loja SAM VITRINE no slug público /loja/samvitrine.
-- A loja antiga criada com nome derivado do e-mail recebe um slug próprio,
-- evitando colisão e impedindo que seus links sejam confundidos com a SAM VITRINE.

update public.organizations
set slug = 'loja-diano-baiano2012-v2',
    updated_at = now()
where slug = 'loja-diano-baiano2012'
  and not exists (
    select 1
    from public.organizations existing
    where existing.slug = 'loja-diano-baiano2012-v2'
      and existing.id <> public.organizations.id
  );