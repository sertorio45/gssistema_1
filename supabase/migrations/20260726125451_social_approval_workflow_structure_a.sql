-- Social approval workflow v2 — structure, backfill and compatibility layer.
-- Keeps social_posts.status as a derived compatibility field for existing queries.

-- ---------------------------------------------------------------------------
-- Split editorial / publication state on social_posts
-- ---------------------------------------------------------------------------

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS editorial_status public.social_editorial_status,
  ADD COLUMN IF NOT EXISTS publication_status public.social_publication_status,
  ADD COLUMN IF NOT EXISTS workflow_id uuid,
  ADD COLUMN IF NOT EXISTS approval_bypassed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_bypass_reason text,
  ADD COLUMN IF NOT EXISTS approval_bypassed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_bypassed_at timestamptz;

UPDATE public.social_posts
SET
  editorial_status = CASE status::text
    WHEN 'draft' THEN 'draft'::public.social_editorial_status
    WHEN 'pending_approval' THEN 'client_review'::public.social_editorial_status
    WHEN 'changes_requested' THEN 'changes_requested'::public.social_editorial_status
    WHEN 'approved' THEN 'approved'::public.social_editorial_status
    WHEN 'scheduled' THEN 'approved'::public.social_editorial_status
    WHEN 'publishing' THEN 'approved'::public.social_editorial_status
    WHEN 'published' THEN 'approved'::public.social_editorial_status
    WHEN 'failed' THEN 'approved'::public.social_editorial_status
    WHEN 'archived' THEN 'cancelled'::public.social_editorial_status
    ELSE 'draft'::public.social_editorial_status
  END,
  publication_status = CASE status::text
    WHEN 'draft' THEN 'not_scheduled'::public.social_publication_status
    WHEN 'pending_approval' THEN 'not_scheduled'::public.social_publication_status
    WHEN 'changes_requested' THEN 'not_scheduled'::public.social_publication_status
    WHEN 'approved' THEN 'not_scheduled'::public.social_publication_status
    WHEN 'scheduled' THEN 'scheduled'::public.social_publication_status
    WHEN 'publishing' THEN 'publishing'::public.social_publication_status
    WHEN 'published' THEN 'published'::public.social_publication_status
    WHEN 'failed' THEN 'failed'::public.social_publication_status
    WHEN 'archived' THEN 'deleted'::public.social_publication_status
    ELSE 'not_scheduled'::public.social_publication_status
  END
WHERE editorial_status IS NULL OR publication_status IS NULL;

-- Refine pending_approval using existing stage on open requests.
UPDATE public.social_posts sp
SET editorial_status = CASE ar.stage::text
  WHEN 'internal' THEN 'internal_review'::public.social_editorial_status
  ELSE 'client_review'::public.social_editorial_status
END
FROM public.approval_requests ar
WHERE ar.post_id = sp.id
  AND ar.status = 'pending'
  AND sp.status = 'pending_approval';

ALTER TABLE public.social_posts
  ALTER COLUMN editorial_status SET DEFAULT 'draft'::public.social_editorial_status,
  ALTER COLUMN publication_status SET DEFAULT 'not_scheduled'::public.social_publication_status,
  ALTER COLUMN editorial_status SET NOT NULL,
  ALTER COLUMN publication_status SET NOT NULL;

CREATE OR REPLACE FUNCTION private.sync_legacy_social_post_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_legacy text;
BEGIN
  IF NEW.publication_status = 'deleted' OR NEW.editorial_status = 'cancelled' THEN
    v_legacy := 'archived';
  ELSIF NEW.publication_status = 'deletion_pending' THEN
    v_legacy := 'archived';
  ELSIF NEW.publication_status = 'published' THEN
    v_legacy := 'published';
  ELSIF NEW.publication_status = 'partially_published' THEN
    v_legacy := 'publishing';
  ELSIF NEW.publication_status = 'publishing' THEN
    v_legacy := 'publishing';
  ELSIF NEW.publication_status = 'scheduled' THEN
    v_legacy := 'scheduled';
  ELSIF NEW.publication_status = 'failed' THEN
    v_legacy := 'failed';
  ELSIF NEW.editorial_status = 'approved' THEN
    v_legacy := 'approved';
  ELSIF NEW.editorial_status = 'changes_requested' THEN
    v_legacy := 'changes_requested';
  ELSIF NEW.editorial_status IN ('internal_review', 'client_review') THEN
    v_legacy := 'pending_approval';
  ELSIF NEW.editorial_status = 'rejected' THEN
    v_legacy := 'archived';
  ELSE
    v_legacy := 'draft';
  END IF;

  NEW.status := v_legacy::public.social_post_status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_legacy_social_post_status ON public.social_posts;
CREATE TRIGGER sync_legacy_social_post_status
  BEFORE INSERT OR UPDATE OF editorial_status, publication_status
  ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_legacy_social_post_status();

-- ---------------------------------------------------------------------------
-- Configurable workflows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.social_approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL CHECK (slug ~ '^[a-z][a-z0-9_-]*$'),
  description text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_approval_workflows_scope_check CHECK (
    (is_system = true AND organization_id IS NULL AND tenant_id IS NULL)
    OR (is_system = false AND organization_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS social_approval_workflows_system_slug_uidx
  ON public.social_approval_workflows (slug)
  WHERE is_system = true;

CREATE UNIQUE INDEX IF NOT EXISTS social_approval_workflows_org_slug_uidx
  ON public.social_approval_workflows (organization_id, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
  WHERE is_system = false;

CREATE INDEX IF NOT EXISTS social_approval_workflows_tenant_idx
  ON public.social_approval_workflows (tenant_id)
  WHERE tenant_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_social_approval_workflows_updated_at ON public.social_approval_workflows;
CREATE TRIGGER set_social_approval_workflows_updated_at
  BEFORE UPDATE ON public.social_approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.social_approval_workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.social_approval_workflows(id) ON DELETE CASCADE,
  position int NOT NULL CHECK (position >= 1),
  name text NOT NULL,
  stage_type public.social_workflow_stage_type NOT NULL,
  mode public.social_workflow_stage_mode NOT NULL DEFAULT 'any',
  minimum_approvals int NOT NULL DEFAULT 1 CHECK (minimum_approvals >= 1),
  due_hours int CHECK (due_hours IS NULL OR due_hours > 0),
  required_capability text,
  allow_self_approval boolean NOT NULL DEFAULT false,
  auto_advance boolean NOT NULL DEFAULT true,
  require_comment_on_reject boolean NOT NULL DEFAULT true,
  allow_rejection boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, position)
);

DROP TRIGGER IF EXISTS set_social_approval_workflow_stages_updated_at ON public.social_approval_workflow_stages;
CREATE TRIGGER set_social_approval_workflow_stages_updated_at
  BEFORE UPDATE ON public.social_approval_workflow_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Approver assignment rules (resolved into concrete users when a stage starts).
CREATE TABLE IF NOT EXISTS public.social_approval_stage_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.social_approval_workflow_stages(id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('user', 'role', 'client_default', 'alternate')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.organization_roles(id) ON DELETE CASCADE,
  is_alternate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_approval_stage_assignees_target_check CHECK (
    (assignee_type = 'user' AND user_id IS NOT NULL)
    OR (assignee_type = 'role' AND role_id IS NOT NULL)
    OR (assignee_type IN ('client_default', 'alternate'))
  )
);

-- ---------------------------------------------------------------------------
-- Evolve approval_requests into versioned workflow runs
-- ---------------------------------------------------------------------------

ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES public.social_approval_workflows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_stage_id uuid REFERENCES public.social_approval_workflow_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS run_group_id uuid,
  ADD COLUMN IF NOT EXISTS stage_position int,
  ADD COLUMN IF NOT EXISTS run_status public.social_approval_run_status,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.approval_requests
SET
  run_group_id = coalesce(run_group_id, id),
  run_status = CASE status::text
    WHEN 'pending' THEN 'pending'::public.social_approval_run_status
    WHEN 'approved' THEN 'approved'::public.social_approval_run_status
    WHEN 'changes_requested' THEN 'changes_requested'::public.social_approval_run_status
    WHEN 'cancelled' THEN 'cancelled'::public.social_approval_run_status
    WHEN 'rejected' THEN 'rejected'::public.social_approval_run_status
    ELSE 'pending'::public.social_approval_run_status
  END,
  stage = coalesce(stage, 'client'::public.approval_stage),
  stage_position = coalesce(stage_position, 1)
WHERE run_status IS NULL;

ALTER TABLE public.approval_requests
  ALTER COLUMN run_group_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN run_status SET DEFAULT 'pending'::public.social_approval_run_status;

ALTER TABLE public.approval_requests
  ALTER COLUMN run_group_id SET NOT NULL,
  ALTER COLUMN run_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS approval_requests_run_group_idx
  ON public.approval_requests (run_group_id, stage_position);

CREATE INDEX IF NOT EXISTS approval_requests_workflow_stage_idx
  ON public.approval_requests (workflow_id, workflow_stage_id)
  WHERE workflow_id IS NOT NULL;

-- Snapshot role labels on assigned approvers so history survives role edits.
ALTER TABLE public.approval_request_approvers
  ADD COLUMN IF NOT EXISTS role_id uuid,
  ADD COLUMN IF NOT EXISTS role_name text,
  ADD COLUMN IF NOT EXISTS role_slug text,
  ADD COLUMN IF NOT EXISTS assigned_capability text,
  ADD COLUMN IF NOT EXISTS is_alternate boolean NOT NULL DEFAULT false;

-- Immutable decisions: expand allowed values; forbid updates via trigger.
ALTER TABLE public.approval_decisions
  DROP CONSTRAINT IF EXISTS approval_decisions_decision_check;
ALTER TABLE public.approval_decisions
  ADD CONSTRAINT approval_decisions_decision_check
  CHECK (decision = ANY (ARRAY['approved'::text, 'changes_requested'::text, 'rejected'::text]));

CREATE OR REPLACE FUNCTION private.forbid_approval_decision_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'approval_decisions_are_immutable';
END;
$$;

DROP TRIGGER IF EXISTS forbid_approval_decision_update ON public.approval_decisions;
CREATE TRIGGER forbid_approval_decision_update
  BEFORE UPDATE ON public.approval_decisions
  FOR EACH ROW
  EXECUTE FUNCTION private.forbid_approval_decision_update();

