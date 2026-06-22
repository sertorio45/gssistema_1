// https://nuxt.com/docs/api/configuration/nuxt-config
import { APP_DESCRIPTION, APP_FULL_NAME, APP_NAME } from './constants/app'

export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: true,

  app: {
    head: {
      title: APP_FULL_NAME,
      titleTemplate: `%s · ${APP_NAME}`,
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: APP_DESCRIPTION },
        { name: 'application-name', content: APP_FULL_NAME },
      ],
      link: [{ rel: 'icon', href: '/favicon.ico' }],
    },
  },

  modules: [
    '@unocss/nuxt',
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxtjs/supabase',
    '@nuxt/image',
  ],

  css: [
    '@unocss/reset/tailwind.css',
    '~/assets/css/vue-flow-overrides.css',
  ],

  colorMode: {
    classSuffix: '',
  },

  features: {
    // For UnoCSS
    inlineStyles: false,
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  routeRules: {
    '/crm/marketing': { ssr: true },
    '/crm/marketing/**': { ssr: true },
    '/whatsapp': { ssr: true },
    '/whatsapp/**': { ssr: true },
    // Inbox usa realtime e componentes client-only; evita erro de vnode no SSR.
    '/whatsapp/conversations': { ssr: false },
    '/whatsapp/conversations/**': { ssr: false },
    '/whatsapp/flows/**': { ssr: false },
  },

  imports: {
    dirs: [
      './lib',
      './composables/whatsapp',
    ],
  },

  pinia: {
    storesDirs: ['./stores/**'],
  },

  compatibilityDate: '2024-12-14',

  runtimeConfig: {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'https://ollama.gsstudio.com.br',
    ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'qwen',
    ollamaCfAccessClientId: process.env.OLLAMA_CF_ACCESS_CLIENT_ID || '',
    ollamaCfAccessClientSecret: process.env.OLLAMA_CF_ACCESS_CLIENT_SECRET || '',
  },

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [
        '/login',
        '/login-basic',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/confirm',
        '/403',
        '/404',
        '/401',
        '/500',
        '/503',
        '/api/**',
      ],
    },
  },
})
