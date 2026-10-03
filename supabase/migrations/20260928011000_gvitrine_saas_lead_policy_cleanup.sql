-- Remove the older permissive lead insert policy.
-- The replacement policy already preserves legacy NULL-tenant inserts
-- and allows only active SaaS tenants.
drop policy if exists "public_insert_leads" on public.leads;