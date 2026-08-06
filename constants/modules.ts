/**
 * Metadata for modules displayed in the module selector.
 * module_name must match tenant_modules.module_name in the database.
 */
export interface ModuleMeta {
  slug: string
  title: string
  icon: string
  basePath: string
  /** Initial page when entering the module. Falls back to basePath if not set. */
  defaultPath?: string
}

export const MODULE_META: Record<string, ModuleMeta> = {
  crm: {
    slug: 'crm',
    title: 'CRM',
    icon: '/icons/modules/crm/crm.svg',
    basePath: '/crm',
    defaultPath: '/crm/dashboard',
  },
  article: {
    slug: 'article',
    title: 'Articles',
    icon: 'lucide:book-a',
    basePath: '/articles',
  },
  marketing: {
    slug: 'marketing',
    title: 'Marketing',
    icon: 'lucide:megaphone',
    basePath: '/marketing',
    defaultPath: '/marketing',
  },
  whatsapp: {
    slug: 'whatsapp',
    title: 'WhatsApp',
    icon: 'lucide:message-circle',
    basePath: '/whatsapp',
    defaultPath: '/whatsapp/dashboard',
  },
}

export const DEFAULT_MODULE_SLUG = 'crm'

/** Bundle row in tenant_modules that grants every module in MODULE_META. */
export const TENANT_MODULE_BUNDLE_ALL = 'all'

export const ASSIGNABLE_MODULE_SLUGS = Object.keys(MODULE_META) as Array<
  keyof typeof MODULE_META
>

export const ASSIGNABLE_TENANT_MODULE_NAMES = [
  ...ASSIGNABLE_MODULE_SLUGS,
  TENANT_MODULE_BUNDLE_ALL,
] as const

export type AssignableTenantModuleName = typeof ASSIGNABLE_TENANT_MODULE_NAMES[number]

/** Portuguese labels for admin / onboarding module pickers. */
export const MODULE_LABELS_PT: Record<string, string> = {
  crm: 'CRM',
  article: 'Artigos',
  marketing: 'Marketing',
  whatsapp: 'WhatsApp',
  all: 'Todos os módulos',
}

/** Short descriptions shown in module switchers and hub tiles. */
export const MODULE_DESCRIPTIONS_PT: Record<string, string> = {
  crm: 'Funil, contatos e negócios',
  marketing: 'Conteúdo, calendário e aprovações',
  whatsapp: 'Inbox, campanhas e automações',
  article: 'Conteúdo e publicações no CMS',
  all: 'Libera todos os módulos para este cliente',
}

export function resolveTenantModuleSlugs(
  activeModuleNames: string[],
): string[] {
  if (activeModuleNames.includes(TENANT_MODULE_BUNDLE_ALL))
    return [...ASSIGNABLE_MODULE_SLUGS]
  return ASSIGNABLE_MODULE_SLUGS.filter(slug => activeModuleNames.includes(slug))
}
