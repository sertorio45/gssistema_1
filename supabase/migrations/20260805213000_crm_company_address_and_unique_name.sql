-- CRM company: structured address fields + unique name per tenant (case-insensitive).

ALTER TABLE public.crm_company
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text;

-- Deduplicate existing names before the unique index (suffix " (2)", " (3)", …).
DO $$
DECLARE
  r RECORD;
  next_suffix integer;
  candidate text;
BEGIN
  FOR r IN
    SELECT id, tenant_id, name
    FROM public.crm_company
    WHERE id IN (
      SELECT id
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY tenant_id, lower(trim(name))
            ORDER BY created_at ASC NULLS LAST, id ASC
          ) AS rn
        FROM public.crm_company
        WHERE name IS NOT NULL AND trim(name) <> ''
      ) ranked
      WHERE rn > 1
    )
  LOOP
    next_suffix := 2;
    LOOP
      candidate := trim(r.name) || ' (' || next_suffix || ')';
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.crm_company c
        WHERE c.tenant_id = r.tenant_id
          AND lower(trim(c.name)) = lower(candidate)
          AND c.id <> r.id
      );
      next_suffix := next_suffix + 1;
    END LOOP;

    UPDATE public.crm_company
    SET name = candidate, updated_at = now()
    WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS crm_company_tenant_name_unique
  ON public.crm_company (tenant_id, lower(trim(name)))
  WHERE name IS NOT NULL AND trim(name) <> '';

COMMENT ON COLUMN public.crm_company.address_number IS 'Street number for the company address';
COMMENT ON COLUMN public.crm_company.address_complement IS 'Address complement (apt, suite, etc.)';
