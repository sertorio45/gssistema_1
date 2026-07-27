-- Etapa 5: domain automations — tenant rules + execution log.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_automation_trigger') THEN
    CREATE TYPE public.social_automation_trigger AS ENUM (
      'briefing.submitted',
      'task.copy.completed',
      'task.design.completed',
      'task.review.completed',
      'approval.overdue',
      'approval.changes_requested',
      'editorial.approved',
      'publication.failed',
      'content.stalled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_automation_run_status') THEN
    CREATE TYPE public.social_automation_run_status AS ENUM (
      'succeeded',
      'skipped',
      'failed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.social_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  trigger_key public.social_automation_trigger NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_automation_rules_tenant_trigger_unique UNIQUE (tenant_id, trigger_key)
);

CREATE INDEX IF NOT EXISTS social_automation_rules_tenant_idx
  ON public.social_automation_rules (tenant_id, enabled);

CREATE TABLE IF NOT EXISTS public.social_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  trigger_key public.social_automation_trigger NOT NULL,
  status public.social_automation_run_status NOT NULL,
  post_id uuid,
  entity_type text,
  entity_id text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_automation_runs_tenant_idx
  ON public.social_automation_runs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS social_automation_runs_trigger_idx
  ON public.social_automation_runs (tenant_id, trigger_key, created_at DESC);

-- Caps
INSERT INTO public.capabilities (key, description)
VALUES
  ('marketing.social.automations.read', 'Visualizar regras de automação'),
  ('marketing.social.automations.manage', 'Gerenciar automações de produção')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.automations.read'),
  ('marketing.social.automations.manage')
) AS c(capability)
WHERE r.slug IN ('owner', 'agency_admin', 'marketing_manager')
  AND r.organization_type IN ('agency', 'direct')
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.automations.read')
) AS c(capability)
WHERE r.slug IN ('social_media', 'analyst')
  AND r.organization_type = 'agency'
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('admin', 'marketing.social.automations.read'),
    ('admin', 'marketing.social.automations.manage'),
    ('funcionario', 'marketing.social.automations.read'),
    ('funcionario', 'marketing.social.automations.manage'),
    ('cliente', 'marketing.social.automations.read')
) AS seed(role_name, capability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities rc
  WHERE rc.role = seed.role_name::public.app_role
    AND rc.capability = seed.capability
    AND rc.tenant_id IS NULL
);

ALTER TABLE public.social_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read ON public.social_automation_rules;
CREATE POLICY tenant_read ON public.social_automation_rules
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.social_automation_rules;
CREATE POLICY social_manage ON public.social_automation_rules
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.automations.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.automations.manage'));

DROP POLICY IF EXISTS tenant_read ON public.social_automation_runs;
CREATE POLICY tenant_read ON public.social_automation_runs
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.social_automation_runs;
DROP POLICY IF EXISTS social_insert ON public.social_automation_runs;
CREATE POLICY social_insert ON public.social_automation_runs
  FOR INSERT TO authenticated
  WITH CHECK (private.user_has_tenant_access(tenant_id));

COMMENT ON TABLE public.social_automation_rules IS
  'Per-tenant toggles for marketing production automations (opt-out; missing row = enabled).';
COMMENT ON TABLE public.social_automation_runs IS
  'Execution log for social domain automations.';
