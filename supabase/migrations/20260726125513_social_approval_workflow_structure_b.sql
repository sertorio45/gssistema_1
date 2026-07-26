-- ---------------------------------------------------------------------------
-- Tenant settings: default workflow
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.social_approval_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenant(id) ON DELETE CASCADE,
  requires_internal_review boolean NOT NULL DEFAULT false,
  default_workflow_id uuid REFERENCES public.social_approval_workflows(id) ON DELETE SET NULL,
  allow_no_approval_workflow boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_approval_settings
  ADD COLUMN IF NOT EXISTS default_workflow_id uuid REFERENCES public.social_approval_workflows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allow_no_approval_workflow boolean NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS set_social_approval_settings_updated_at ON public.social_approval_settings;
CREATE TRIGGER set_social_approval_settings_updated_at
  BEFORE UPDATE ON public.social_approval_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.social_posts
  DROP CONSTRAINT IF EXISTS social_posts_workflow_id_fkey;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_workflow_id_fkey
  FOREIGN KEY (workflow_id) REFERENCES public.social_approval_workflows(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Notification idempotency
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_idempotency_uidx
  ON public.notifications (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- System workflow templates
-- ---------------------------------------------------------------------------

INSERT INTO public.social_approval_workflows (
  id, organization_id, tenant_id, name, slug, description, is_system, is_default, is_active
)
SELECT *
FROM (VALUES
  ('11111111-1111-4111-8111-111111111101'::uuid, NULL::uuid, NULL::uuid,
   'Aprovação simples', 'simple_client',
   'Rascunho → Cliente → Aprovado', true, true, true),
  ('11111111-1111-4111-8111-111111111102'::uuid, NULL::uuid, NULL::uuid,
   'Agência com revisão interna', 'agency_internal_client',
   'Rascunho → Revisão interna → Cliente → Aprovado', true, false, true),
  ('11111111-1111-4111-8111-111111111103'::uuid, NULL::uuid, NULL::uuid,
   'Sem aprovação', 'no_approval',
   'Rascunho → Pronto para agendar (sem etapas de aprovação)', true, false, true)
) AS v(id, organization_id, tenant_id, name, slug, description, is_system, is_default, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.social_approval_workflows existing WHERE existing.id = v.id OR (existing.is_system AND existing.slug = v.slug)
);

INSERT INTO public.social_approval_workflow_stages (
  workflow_id, position, name, stage_type, mode, minimum_approvals,
  required_capability, allow_self_approval, auto_advance, require_comment_on_reject, allow_rejection
)
SELECT v.workflow_id, v.position, v.name, v.stage_type::public.social_workflow_stage_type,
       v.mode::public.social_workflow_stage_mode, v.minimum_approvals,
       v.required_capability, v.allow_self_approval, true, true, v.allow_rejection
FROM (VALUES
  ('11111111-1111-4111-8111-111111111101'::uuid, 1, 'Aprovação do cliente', 'client', 'any', 1,
   'marketing.social.approval.client', false, true),
  ('11111111-1111-4111-8111-111111111102'::uuid, 1, 'Revisão interna', 'internal', 'any', 1,
   'marketing.social.approval.internal', false, true),
  ('11111111-1111-4111-8111-111111111102'::uuid, 2, 'Aprovação do cliente', 'client', 'any', 1,
   'marketing.social.approval.client', false, true)
) AS v(workflow_id, position, name, stage_type, mode, minimum_approvals, required_capability, allow_self_approval, allow_rejection)
WHERE NOT EXISTS (
  SELECT 1 FROM public.social_approval_workflow_stages s
  WHERE s.workflow_id = v.workflow_id AND s.position = v.position
);

-- Capability catalog entry for bypass
INSERT INTO public.capabilities (key, description)
VALUES (
  'marketing.social.approval.bypass',
  'Ignorar fluxo de aprovação com justificativa auditada'
)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Concurrent stage decision lock helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.lock_approval_request(p_request_id uuid, p_actor_id uuid)
RETURNS public.approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.approval_requests;
BEGIN
  SELECT * INTO v_row
  FROM public.approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval_request_not_found';
  END IF;

  IF v_row.run_status <> 'pending' OR v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'approval_request_not_pending';
  END IF;

  UPDATE public.approval_requests
  SET locked_at = now(), locked_by = p_actor_id
  WHERE id = p_request_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION private.lock_approval_request(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.lock_approval_request(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.lock_approval_request(p_request_id uuid, p_actor_id uuid)
RETURNS public.approval_requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT * FROM private.lock_approval_request(p_request_id, p_actor_id);
$$;

REVOKE ALL ON FUNCTION public.lock_approval_request(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_approval_request(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_approval_request(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.social_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_approval_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_approval_stage_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_approval_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_approval_workflows_select ON public.social_approval_workflows;
CREATE POLICY social_approval_workflows_select ON public.social_approval_workflows
  FOR SELECT TO authenticated
  USING (
    is_system = true
    OR private.is_platform_staff()
    OR (organization_id IS NOT NULL AND private.user_can_view_organization(organization_id))
    OR (tenant_id IS NOT NULL AND private.user_has_tenant_access(tenant_id))
  );

DROP POLICY IF EXISTS social_approval_workflows_manage ON public.social_approval_workflows;
CREATE POLICY social_approval_workflows_manage ON public.social_approval_workflows
  FOR ALL TO authenticated
  USING (
    is_system = false
    AND (
      private.is_platform_staff()
      OR (organization_id IS NOT NULL AND public.user_can_manage_organization(organization_id))
    )
  )
  WITH CHECK (
    is_system = false
    AND (
      private.is_platform_staff()
      OR (organization_id IS NOT NULL AND public.user_can_manage_organization(organization_id))
    )
  );

DROP POLICY IF EXISTS social_approval_workflow_stages_select ON public.social_approval_workflow_stages;
CREATE POLICY social_approval_workflow_stages_select ON public.social_approval_workflow_stages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.social_approval_workflows w
      WHERE w.id = workflow_id
        AND (
          w.is_system = true
          OR private.is_platform_staff()
          OR (w.organization_id IS NOT NULL AND private.user_can_view_organization(w.organization_id))
          OR (w.tenant_id IS NOT NULL AND private.user_has_tenant_access(w.tenant_id))
        )
    )
  );

DROP POLICY IF EXISTS social_approval_workflow_stages_manage ON public.social_approval_workflow_stages;
CREATE POLICY social_approval_workflow_stages_manage ON public.social_approval_workflow_stages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.social_approval_workflows w
      WHERE w.id = workflow_id
        AND w.is_system = false
        AND (
          private.is_platform_staff()
          OR (w.organization_id IS NOT NULL AND public.user_can_manage_organization(w.organization_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_approval_workflows w
      WHERE w.id = workflow_id
        AND w.is_system = false
        AND (
          private.is_platform_staff()
          OR (w.organization_id IS NOT NULL AND public.user_can_manage_organization(w.organization_id))
        )
    )
  );

DROP POLICY IF EXISTS social_approval_stage_assignees_select ON public.social_approval_stage_assignees;
CREATE POLICY social_approval_stage_assignees_select ON public.social_approval_stage_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.social_approval_workflow_stages s
      JOIN public.social_approval_workflows w ON w.id = s.workflow_id
      WHERE s.id = stage_id
        AND (
          w.is_system = true
          OR private.is_platform_staff()
          OR (w.organization_id IS NOT NULL AND private.user_can_view_organization(w.organization_id))
        )
    )
  );

DROP POLICY IF EXISTS social_approval_stage_assignees_manage ON public.social_approval_stage_assignees;
CREATE POLICY social_approval_stage_assignees_manage ON public.social_approval_stage_assignees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.social_approval_workflow_stages s
      JOIN public.social_approval_workflows w ON w.id = s.workflow_id
      WHERE s.id = stage_id
        AND w.is_system = false
        AND (
          private.is_platform_staff()
          OR (w.organization_id IS NOT NULL AND public.user_can_manage_organization(w.organization_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.social_approval_workflow_stages s
      JOIN public.social_approval_workflows w ON w.id = s.workflow_id
      WHERE s.id = stage_id
        AND w.is_system = false
        AND (
          private.is_platform_staff()
          OR (w.organization_id IS NOT NULL AND public.user_can_manage_organization(w.organization_id))
        )
    )
  );

DROP POLICY IF EXISTS social_approval_settings_select ON public.social_approval_settings;
CREATE POLICY social_approval_settings_select ON public.social_approval_settings
  FOR SELECT TO authenticated
  USING (private.user_has_tenant_access(tenant_id) OR private.is_platform_staff());

DROP POLICY IF EXISTS social_approval_settings_manage ON public.social_approval_settings;
CREATE POLICY social_approval_settings_manage ON public.social_approval_settings
  FOR ALL TO authenticated
  USING (private.is_platform_staff() OR public.user_has_tenant_capability(tenant_id, 'marketing.social.workflow.manage'))
  WITH CHECK (private.is_platform_staff() OR public.user_has_tenant_capability(tenant_id, 'marketing.social.workflow.manage'));
