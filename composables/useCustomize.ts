import type { Theme } from '@/lib/registry/themes'
import { themes } from '@/lib/registry/themes'

interface Config {
  theme?: Theme['name']
  radius: number
}

export function useCustomize() {
  const { value: color } = useColorMode()
  const isDark = color === 'dark'
  const config = useCookie<Config>('config', {
    default: () => ({
      theme: 'zinc',
      radius: 0.5,
    }),
  })

  const themeClass = computed(() => `theme-${config.value.theme}`)

  const theme = computed(() => config.value.theme)
  const radius = computed(() => config.value.radius)

  function setTheme(themeName: Theme['name']) {
    config.value.theme = themeName
  }

  function setRadius(newRadius: number) {
    config.value.radius = newRadius
  }

  const themePrimary = computed(() => {
    const t = themes.find(t => t.name === theme.value)
    return `hsl(${t?.cssVars[isDark ? 'dark' : 'light'].primary})`
  })

  return {
    themeClass,
    theme,
    setTheme,
    radius,
    setRadius,
    themePrimary,
  }
}

export function useJwt() {
  function decodeJWT(token: string) {
    try {
      const base64Url = token.split('.')[1]
      if (!base64Url)
        return null
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => {
            return `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`
          })
          .join(''),
      )
      return JSON.parse(jsonPayload)
    }
    catch {
      return null
    }
  }
  return { decodeJWT }
}
