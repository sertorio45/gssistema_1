-- Etapa 2: operational Kanban (production_status) + role tasks.
-- Keeps production separate from editorial_status and publication_status.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_production_status') THEN
    CREATE TYPE public.social_production_status AS ENUM (
      'backlog',
      'briefing_pending',
      'copy_in_progress',
      'design_in_progress',
      'internal_review',
      'awaiting_client_approval',
      'changes_requested',
      'approved',
      'scheduled',
      'published',
      'blocked'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_production_priority') THEN
    CREATE TYPE public.social_production_priority AS ENUM (
      'low',
      'normal',
      'high',
      'urgent'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_production_task_type') THEN
    CREATE TYPE public.social_production_task_type AS ENUM (
      'prepare_briefing',
      'write_copy',
      'create_design',
      'review',
      'send_to_client',
      'fix',
      'schedule',
      'verify_publication',
      'custom'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_production_task_status') THEN
    CREATE TYPE public.social_production_task_status AS ENUM (
      'todo',
      'in_progress',
      'blocked',
      'done',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_production_task_role') THEN
    CREATE TYPE public.social_production_task_role AS ENUM (
      'copywriter',
      'designer',
      'social_media',
      'reviewer',
      'manager',
      'any'
    );
  END IF;
END
$$;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS production_status public.social_production_status NOT NULL DEFAULT 'backlog',
  ADD COLUMN IF NOT EXISTS production_priority public.social_production_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS production_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS copy_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS design_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS publish_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Soft backfill from existing editorial/publication axes (never overwrite blocked).
UPDATE public.social_posts
SET production_status = CASE
  WHEN publication_status::text IN ('published', 'partially_published') THEN 'published'::public.social_production_status
  WHEN publication_status::text = 'scheduled' THEN 'scheduled'::public.social_production_status
  WHEN editorial_status::text = 'approved' THEN 'approved'::public.social_production_status
  WHEN editorial_status::text = 'changes_requested' THEN 'changes_requested'::public.social_production_status
  WHEN editorial_status::text = 'client_review' THEN 'awaiting_client_approval'::public.social_production_status
  WHEN editorial_status::text = 'internal_review' THEN 'internal_review'::public.social_production_status
  WHEN editorial_status::text = 'draft' THEN 'backlog'::public.social_production_status
  ELSE production_status
END
WHERE deleted_at IS NULL
  AND production_status = 'backlog';

CREATE INDEX IF NOT EXISTS social_posts_tenant_production_idx
  ON public.social_posts (tenant_id, production_status, production_due_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS social_posts_production_owners_idx
  ON public.social_posts (tenant_id, copy_owner_id, design_owner_id, publish_owner_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.social_production_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  from_status public.social_production_status,
  to_status public.social_production_status NOT NULL,
  blocked_reason text,
  note text,
  moved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_production_movements_post_tenant_fkey
    FOREIGN KEY (post_id, tenant_id)
    REFERENCES public.social_posts(id, tenant_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS social_production_movements_post_idx
  ON public.social_production_movements (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS social_production_movements_tenant_idx
  ON public.social_production_movements (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.social_production_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  task_type public.social_production_task_type NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.social_production_task_status NOT NULL DEFAULT 'todo',
  priority public.social_production_priority NOT NULL DEFAULT 'normal',
  role_scope public.social_production_task_role NOT NULL DEFAULT 'any',
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  depends_on uuid[] NOT NULL DEFAULT '{}',
  asset_ids uuid[] NOT NULL DEFAULT '{}',
  blocked_reason text,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_production_tasks_post_tenant_fkey
    FOREIGN KEY (post_id, tenant_id)
    REFERENCES public.social_posts(id, tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT social_production_tasks_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT social_production_tasks_checklist_is_array CHECK (jsonb_typeof(checklist) = 'array')
);

CREATE INDEX IF NOT EXISTS social_production_tasks_post_idx
  ON public.social_production_tasks (post_id, status, due_at);

CREATE INDEX IF NOT EXISTS social_production_tasks_assignee_idx
  ON public.social_production_tasks (tenant_id, assignee_id, status, due_at)
  WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_production_tasks_role_idx
  ON public.social_production_tasks (tenant_id, role_scope, status, due_at);

CREATE TABLE IF NOT EXISTS public.social_production_task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.social_production_tasks(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  event_type text NOT NULL,
  from_status public.social_production_task_status,
  to_status public.social_production_task_status,
  note text,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_production_task_events_task_idx
  ON public.social_production_task_events (task_id, created_at DESC);

-- Capabilities
INSERT INTO public.capabilities (key, description)
VALUES
  ('marketing.social.production.move', 'Mover cards no Kanban de produção'),
  ('marketing.social.production.manage', 'Gerenciar status operacional, bloqueios e responsáveis de produção'),
  ('marketing.social.tasks.manage', 'Criar e gerenciar tarefas internas de produção')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

-- Seed onto agency system roles (by slug) across orgs.
INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.production.move'),
  ('marketing.social.production.manage'),
  ('marketing.social.tasks.manage')
) AS c(capability)
WHERE r.slug IN ('owner', 'agency_admin', 'marketing_manager', 'social_media')
  AND r.organization_type IN ('agency', 'direct')
ON CONFLICT (role_id, capability) DO UPDATE
SET allowed = true, updated_at = now();

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.production.move'),
  ('marketing.social.tasks.manage')
) AS c(capability)
WHERE r.slug IN ('designer', 'copywriter')
  AND r.organization_type = 'agency'
ON CONFLICT (role_id, capability) DO UPDATE
SET allowed = true, updated_at = now();

-- Legacy role_capabilities for non-org flows.
INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('admin', 'marketing.social.production.move'),
    ('admin', 'marketing.social.production.manage'),
    ('admin', 'marketing.social.tasks.manage'),
    ('funcionario', 'marketing.social.production.move'),
    ('funcionario', 'marketing.social.production.manage'),
    ('funcionario', 'marketing.social.tasks.manage'),
    ('cliente', 'marketing.social.production.move'),
    ('cliente', 'marketing.social.production.manage'),
    ('cliente', 'marketing.social.tasks.manage')
) AS seed(role_name, capability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities rc
  WHERE rc.role = seed.role_name::public.app_role
    AND rc.capability = seed.capability
    AND rc.tenant_id IS NULL
);

ALTER TABLE public.social_production_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_production_task_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read ON public.social_production_movements;
CREATE POLICY tenant_read ON public.social_production_movements
  FOR SELECT TO authenticated
  USING (private.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS social_manage ON public.social_production_movements;
CREATE POLICY social_manage ON public.social_production_movements
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.production.move'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.production.move'));

DROP POLICY IF EXISTS tenant_read ON public.social_production_tasks;
CREATE POLICY tenant_read ON public.social_production_tasks
  FOR SELECT TO authenticated
  USING (private.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS social_manage ON public.social_production_tasks;
CREATE POLICY social_manage ON public.social_production_tasks
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.tasks.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.tasks.manage'));

DROP POLICY IF EXISTS tenant_read ON public.social_production_task_events;
CREATE POLICY tenant_read ON public.social_production_task_events
  FOR SELECT TO authenticated
  USING (private.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS social_manage ON public.social_production_task_events;
CREATE POLICY social_manage ON public.social_production_task_events
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.tasks.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.tasks.manage'));

COMMENT ON COLUMN public.social_posts.production_status IS
  'Operational Kanban column. Independent from editorial_status and publication_status.';
COMMENT ON TABLE public.social_production_tasks IS
  'Internal production tasks by role (copy, design, review, etc.).';
