-- Agency operational area: client profiles, onboarding drafts and branding contract.
-- Branding stays in organizations.settings (jsonb) so the platform is not coupled
-- to a single agency identity (GS Studio or otherwise).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agency_onboarding_status') THEN
    CREATE TYPE public.agency_onboarding_status AS ENUM (
      'draft',
      'in_progress',
      'completed',
      'cancelled',
      'failed'
    );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- organization_tenants: operational profile of each managed client
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_tenants
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS internal_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organization_tenants.display_name IS
  'Commercial name shown in the agency portfolio. Falls back to tenant.name.';
COMMENT ON COLUMN public.organization_tenants.logo_url IS
  'Optional client logo URL. Never embeds secrets.';
COMMENT ON COLUMN public.organization_tenants.internal_owner_user_id IS
  'Agency staff member accountable for the client relationship.';
COMMENT ON COLUMN public.organization_tenants.metadata IS
  'Non-sensitive operational extras (notes, invite display overrides).';

CREATE INDEX IF NOT EXISTS organization_tenants_owner_idx
  ON public.organization_tenants (internal_owner_user_id)
  WHERE internal_owner_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- agency_client_onboardings: controlled multi-step client intake
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agency_client_onboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE SET NULL,
  status public.agency_onboarding_status NOT NULL DEFAULT 'draft',
  current_step text NOT NULL DEFAULT 'client_data',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT agency_client_onboardings_step_check CHECK (
    current_step IN (
      'client_data',
      'tenant',
      'modules',
      'agency_owners',
      'client_invite',
      'approval_flow',
      'social_connect',
      'review'
    )
  ),
  CONSTRAINT agency_client_onboardings_completed_check CHECK (
    (status = 'completed' AND tenant_id IS NOT NULL AND completed_at IS NOT NULL)
    OR (status <> 'completed')
  )
);

COMMENT ON TABLE public.agency_client_onboardings IS
  'Draftable agency client onboarding. Completion is transactional via private.provision_agency_client.';

CREATE INDEX IF NOT EXISTS agency_client_onboardings_org_status_idx
  ON public.agency_client_onboardings (organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS agency_client_onboardings_tenant_idx
  ON public.agency_client_onboardings (tenant_id)
  WHERE tenant_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_agency_client_onboardings_updated_at ON public.agency_client_onboardings;
CREATE TRIGGER set_agency_client_onboardings_updated_at
  BEFORE UPDATE ON public.agency_client_onboardings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Branding contract documented on organizations.settings
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.organizations.settings IS
  'Organization settings jsonb. Agency branding lives under settings.branding: {
     commercial_name, logo_url, primary_color, custom_domain (reserved),
     invite_display_name, notification_signature
   }. custom_domain is reserved for a future feature and must not drive routing yet.';

-- ---------------------------------------------------------------------------
-- Transactional provision of a managed client workspace
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.provision_agency_client(
  p_organization_id uuid,
  p_onboarding_id uuid,
  p_actor_id uuid,
  p_tenant_id uuid DEFAULT NULL,
  p_tenant_name text DEFAULT NULL,
  p_tenant_slug text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_internal_owner_user_id uuid DEFAULT NULL,
  p_modules text[] DEFAULT ARRAY[]::text[],
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_tenant_id uuid;
  v_module text;
  v_onboarding public.agency_client_onboardings%ROWTYPE;
BEGIN
  SELECT * INTO v_org
  FROM public.organizations
  WHERE id = p_organization_id
    AND type = 'agency'
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'agency_organization_required';
  END IF;

  SELECT * INTO v_onboarding
  FROM public.agency_client_onboardings
  WHERE id = p_onboarding_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'onboarding_not_found';
  END IF;

  IF v_onboarding.status = 'completed' THEN
    RETURN v_onboarding.tenant_id;
  END IF;

  IF v_onboarding.status = 'cancelled' THEN
    RAISE EXCEPTION 'onboarding_cancelled';
  END IF;

  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;

    IF NOT EXISTS (SELECT 1 FROM public.tenant WHERE id = v_tenant_id) THEN
      RAISE EXCEPTION 'tenant_not_found';
    END IF;

    -- A tenant already owned by another organization must stay isolated.
    IF EXISTS (
      SELECT 1
      FROM public.organization_tenants ot
      JOIN public.organizations o ON o.id = ot.organization_id
      WHERE ot.tenant_id = v_tenant_id
        AND ot.is_active = true
        AND ot.organization_id <> p_organization_id
        AND o.type = 'agency'
    ) THEN
      RAISE EXCEPTION 'tenant_already_managed';
    END IF;
  ELSE
    IF coalesce(trim(p_tenant_name), '') = '' OR coalesce(trim(p_tenant_slug), '') = '' THEN
      RAISE EXCEPTION 'tenant_name_and_slug_required';
    END IF;

    INSERT INTO public.tenant (name, slug, is_active)
    VALUES (trim(p_tenant_name), trim(p_tenant_slug), true)
    RETURNING id INTO v_tenant_id;
  END IF;

  INSERT INTO public.organization_tenants (
    organization_id,
    tenant_id,
    is_primary,
    relationship_type,
    is_active,
    started_at,
    ended_at,
    created_by,
    display_name,
    logo_url,
    internal_owner_user_id,
    metadata
  )
  VALUES (
    p_organization_id,
    v_tenant_id,
    false,
    'managed',
    true,
    now(),
    NULL,
    p_actor_id,
    NULLIF(trim(coalesce(p_display_name, p_tenant_name, '')), ''),
    NULLIF(trim(coalesce(p_logo_url, '')), ''),
    p_internal_owner_user_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (organization_id, tenant_id) DO UPDATE
  SET
    is_active = true,
    ended_at = NULL,
    relationship_type = 'managed',
    display_name = EXCLUDED.display_name,
    logo_url = EXCLUDED.logo_url,
    internal_owner_user_id = EXCLUDED.internal_owner_user_id,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  FOREACH v_module IN ARRAY coalesce(p_modules, ARRAY[]::text[])
  LOOP
    INSERT INTO public.tenant_modules (tenant_id, module_name, is_active, activated_at)
    VALUES (v_tenant_id, v_module, true, now())
    ON CONFLICT (tenant_id, module_name) DO UPDATE
    SET is_active = true,
        activated_at = coalesce(tenant_modules.activated_at, now()),
        updated_at = now();
  END LOOP;

  UPDATE public.agency_client_onboardings
  SET
    tenant_id = v_tenant_id,
    status = 'completed',
    current_step = 'review',
    error_message = NULL,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_onboarding_id;

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION private.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.agency_client_onboardings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_client_onboardings_select_scoped ON public.agency_client_onboardings;
CREATE POLICY agency_client_onboardings_select_scoped ON public.agency_client_onboardings
  FOR SELECT TO authenticated
  USING (private.user_can_view_organization(organization_id));

DROP POLICY IF EXISTS agency_client_onboardings_manage_scoped ON public.agency_client_onboardings;
CREATE POLICY agency_client_onboardings_manage_scoped ON public.agency_client_onboardings
  FOR ALL TO authenticated
  USING (public.user_can_manage_organization(organization_id))
  WITH CHECK (public.user_can_manage_organization(organization_id));
