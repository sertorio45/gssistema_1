-- Remove unused CRM fields: company industry/size and contact tags
ALTER TABLE public.crm_company DROP COLUMN IF EXISTS industry;
ALTER TABLE public.crm_company DROP COLUMN IF EXISTS size;
ALTER TABLE public.crm_contact DROP COLUMN IF EXISTS tags;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_company_size') THEN
    DROP TYPE public.crm_company_size;
  END IF;
END $$;
