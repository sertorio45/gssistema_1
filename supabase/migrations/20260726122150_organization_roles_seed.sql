-- Seed the expanded capability catalog, system role templates and backfill
-- existing organizations / memberships so nobody loses access.

-- ---------------------------------------------------------------------------
-- Capability catalog
-- ---------------------------------------------------------------------------

INSERT INTO public.capabilities (key, description)
VALUES
  ('organization.team.read', 'Visualizar a equipe da organização'),
  ('organization.team.manage', 'Convidar, ativar e alterar cargos da equipe'),
  ('organization.roles.read', 'Visualizar cargos da organização'),
  ('organization.roles.manage', 'Criar e editar cargos personalizados'),
  ('agency.clients.read', 'Visualizar a carteira de clientes da agência'),
  ('agency.clients.manage', 'Gerenciar a carteira de clientes da agência'),
  ('marketing.social.update', 'Editar conteúdo de marketing social'),
  ('marketing.social.approval.submit', 'Enviar conteúdo para aprovação'),
  ('marketing.social.approval.internal', 'Aprovar ou solicitar alterações na etapa interna'),
  ('marketing.social.approval.client', 'Aprovar, solicitar alterações ou rejeitar como cliente'),
  ('marketing.social.workflow.manage', 'Configurar o fluxo de aprovação'),
  ('marketing.social.schedule', 'Agendar publicação de conteúdo'),
  ('marketing.social.delete.local', 'Excluir posts localmente'),
  ('marketing.social.delete.remote', 'Excluir posts nas redes sociais'),
  ('marketing.social.reports', 'Visualizar relatórios de marketing social')
ON CONFLICT (key) DO UPDATE SET description = excluded.description;

-- Keep legacy role_capabilities in sync for older RLS predicates.
INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('cliente', 'organization.team.read'),
    ('cliente', 'organization.team.manage'),
    ('cliente', 'organization.roles.read'),
    ('cliente', 'organization.roles.manage'),
    ('cliente', 'agency.clients.read'),
    ('cliente', 'agency.clients.manage'),
    ('cliente', 'marketing.social.update'),
    ('cliente', 'marketing.social.approval.submit'),
    ('cliente', 'marketing.social.approval.internal'),
    ('cliente', 'marketing.social.approval.client'),
    ('cliente', 'marketing.social.workflow.manage'),
    ('cliente', 'marketing.social.schedule'),
    ('cliente', 'marketing.social.delete.local'),
    ('cliente', 'marketing.social.delete.remote'),
    ('cliente', 'marketing.social.reports'),
    ('atendente', 'organization.team.read'),
    ('atendente', 'agency.clients.read'),
    ('atendente', 'marketing.social.update'),
    ('atendente', 'marketing.social.approval.submit')
) AS defaults(role_name, capability)
ON CONFLICT (role, capability) DO NOTHING;

-- ---------------------------------------------------------------------------
-- System templates (organization_id IS NULL)
-- ---------------------------------------------------------------------------

-- Agency: Proprietário
INSERT INTO public.organization_roles (
  organization_id, name, slug, description, organization_type,
  is_system, is_default, is_editable, is_protected, legacy_app_role
)
SELECT
  NULL, 'Proprietário', 'owner',
  'Acesso total à organização, clientes, equipe, cargos, configurações e marketing.',
  'agency', true, true, false, true, 'cliente'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles
  WHERE organization_id IS NULL AND organization_type = 'agency' AND slug = 'owner'
);

INSERT INTO public.organization_roles (
  organization_id, name, slug, description, organization_type,
  is_system, is_default, is_editable, is_protected, legacy_app_role
)
SELECT
  NULL, 'Administrador da agência', 'agency_admin',
  'Gerencia clientes, equipe, cargos não protegidos e marketing, sem alterar o proprietário.',
  'agency', true, false, false, false, 'cliente'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles
  WHERE organization_id IS NULL AND organization_type = 'agency' AND slug = 'agency_admin'
);

INSERT INTO public.organization_roles (
  organization_id, name, slug, description, organization_type,
  is_system, is_default, is_editable, is_protected, legacy_app_role
)
SELECT v.organization_id, v.name, v.slug, v.description, v.organization_type,
  v.is_system, v.is_default, v.is_editable, v.is_protected, v.legacy_app_role
FROM (VALUES
  (NULL::uuid, 'Gestor de marketing', 'marketing_manager',
   'Cria, edita, aprova internamente, agenda e publica conteúdo dos clientes atribuídos.',
   'agency'::public.organization_type, true, false, true, false, 'atendente'::public.app_role),
  (NULL::uuid, 'Social Media', 'social_media',
   'Cria e edita conteúdo, comenta e envia para aprovação. Sem aprovação final nem publicação direta.',
   'agency'::public.organization_type, true, false, true, false, 'atendente'::public.app_role),
  (NULL::uuid, 'Designer', 'designer',
   'Visualiza demandas, envia peças, cria versões e comenta. Sem integrações, aprovação do cliente ou publicação.',
   'agency'::public.organization_type, true, false, true, false, 'atendente'::public.app_role),
  (NULL::uuid, 'Copywriter', 'copywriter',
   'Edita legendas, hashtags, títulos e CTAs. Sem integrações nem publicação.',
   'agency'::public.organization_type, true, false, true, false, 'atendente'::public.app_role),
  (NULL::uuid, 'Aprovador interno', 'internal_approver',
   'Visualiza, comenta e aprova a etapa interna. Sem editar conteúdo aprovado nem publicar.',
   'agency'::public.organization_type, true, false, true, false, 'atendente'::public.app_role),
  (NULL::uuid, 'Analista', 'analyst',
   'Somente leitura de posts, calendário e relatórios.',
   'agency'::public.organization_type, true, false, true, false, 'atendente'::public.app_role)
) AS v(organization_id, name, slug, description, organization_type, is_system, is_default, is_editable, is_protected, legacy_app_role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles r
  WHERE r.organization_id IS NULL
    AND r.organization_type = v.organization_type
    AND r.slug = v.slug
);

INSERT INTO public.organization_roles (
  organization_id, name, slug, description, organization_type,
  is_system, is_default, is_editable, is_protected, legacy_app_role
)
SELECT v.organization_id, v.name, v.slug, v.description, v.organization_type,
  v.is_system, v.is_default, v.is_editable, v.is_protected, v.legacy_app_role
FROM (VALUES
  (NULL::uuid, 'Proprietário/Administrador', 'owner',
   'Gerencia a equipe do cliente, visualiza o tenant e aprova como cliente.',
   'direct'::public.organization_type, true, true, false, true, 'cliente'::public.app_role),
  (NULL::uuid, 'Aprovador', 'approver',
   'Visualiza itens enviados, comenta, aprova, solicita alterações ou rejeita com justificativa.',
   'direct'::public.organization_type, true, false, true, false, 'atendente'::public.app_role),
  (NULL::uuid, 'Editor', 'editor',
   'Cria e edita conteúdo, comenta e envia para aprovação. Sem aprovação final.',
   'direct'::public.organization_type, true, false, true, false, 'atendente'::public.app_role),
  (NULL::uuid, 'Visualizador', 'viewer',
   'Somente leitura.',
   'direct'::public.organization_type, true, false, true, false, 'atendente'::public.app_role)
) AS v(organization_id, name, slug, description, organization_type, is_system, is_default, is_editable, is_protected, legacy_app_role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles r
  WHERE r.organization_id IS NULL
    AND r.organization_type = v.organization_type
    AND r.slug = v.slug
);
