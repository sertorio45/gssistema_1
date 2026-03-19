/**
 * Metadata for modules displayed in the module selector.
 * module_name must match tenant_modules.module_name in the database.
 */
export interface ModuleMeta {
  slug: string
  title: string
  icon: string
  basePath: string
  /** Initial page when entering the module (e.g. dashboard). Falls back to basePath if not set. */
  defaultPath?: string
}

export const MODULE_META: Record<string, ModuleMeta> = {
  crm: {
    slug: 'crm',
    title: 'CRM',
    icon: 'lucide:briefcase',
    basePath: '/crm',
    defaultPath: '/crm/dashboard',
  },
  article: {
    slug: 'article',
    title: 'Articles',
    icon: 'lucide:book-a',
    basePath: '/articles',
  },
  analytics: {
    slug: 'analytics',
    title: 'Analytics',
    icon: 'lucide:bar-chart-3',
    basePath: '/analytics',
  },
}

export const DEFAULT_MODULE_SLUG = 'crm'
