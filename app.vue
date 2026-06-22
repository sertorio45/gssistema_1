<script setup lang="ts">
import { ConfigProvider } from 'radix-vue'

import { Sonner } from '@/components/ui/sonner'
import { APP_DESCRIPTION, APP_FULL_NAME } from '~/constants/app'

const colorMode = useColorMode()

const color = computed(() => (colorMode.value === 'dark' ? '#09090b' : '#ffffff'))

const { theme, radius } = useCustomize()

const route = useRoute()

useHead({
  meta: [
    { key: 'theme-color', name: 'theme-color', content: color },
  ],
  script: [{ src: '/tinymce/tinymce.min.js' }],
  bodyAttrs: {
    class: computed(() => `theme-${theme.value}`),
    style: computed(() => `--radius: ${radius.value}rem;`),
  },
})

useSeoMeta({
  title: APP_FULL_NAME,
  description: APP_DESCRIPTION,
  ogTitle: APP_FULL_NAME,
  ogDescription: APP_DESCRIPTION,
  twitterTitle: APP_FULL_NAME,
  twitterDescription: APP_DESCRIPTION,
  twitterCard: 'summary_large_image',
})

const router = useRouter()

defineShortcuts({
  'G-H': () => router.push('/'),
  'G-E': () => router.push('/email'),
})

const useIdFunction = () => useId()

const textDirection = useTextDirection({ initialValue: 'ltr' })
const dir = computed(() => (textDirection.value === 'rtl' ? 'rtl' : 'ltr'))
</script>

<template>
  <ConfigProvider :use-id="useIdFunction" :dir="dir">
    <div vaul-drawer-wrapper class="relative">
      <NuxtLayout>
        <NuxtPage :key="route.fullPath" />
      </NuxtLayout>

      <AppSettings />
    </div>

    <Toaster />
    <Sonner class="pointer-events-auto" />
  </ConfigProvider>
</template>
