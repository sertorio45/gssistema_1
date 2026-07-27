-- tenant_modules and related tenant FKs should cascade on tenant delete (admin cleanup).

ALTER TABLE public.tenant_modules
  DROP CONSTRAINT IF EXISTS tenant_modules_tenant_id_fkey;

ALTER TABLE public.tenant_modules
  ADD CONSTRAINT tenant_modules_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;
