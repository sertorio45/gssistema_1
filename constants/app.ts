/** Nome comercial exibido na UI e metadados do app */
export const APP_NAME = 'Blimber'
export const APP_TAGLINE = 'Hub de soluções'
export const APP_FULL_NAME = `${APP_NAME} - ${APP_TAGLINE}`

export const APP_DESCRIPTION
  = 'Plataforma multi-tenant com CRM, WhatsApp, artigos e gestão de equipes para empresas e agências.'

/** Sufixo padrão em títulos de página (ex.: "Funil · Blimber") */
export function formatPageTitle(pageTitle?: string | null): string {
  if (!pageTitle?.trim())
    return APP_FULL_NAME
  return `${pageTitle.trim()} · ${APP_NAME}`
}
