<script setup lang="ts">
import { useColorMode } from '#imports'

import { nextTick, onMounted, ref, watch } from 'vue'

import { Skeleton } from '@/components/ui/skeleton'

import { APP_FULL_NAME } from '~/constants/app'

const colorMode = useColorMode()

const logoLight = '/logotipo.svg'
const logoDark = '/logotipo-white.svg'

const logoSrc = ref(logoLight)
const isReady = ref(false)

function updateLogo() {
  if (colorMode.value === 'dark') {
    logoSrc.value = logoDark
    isReady.value = true
    return
  }
  if (colorMode.value === 'light') {
    logoSrc.value = logoLight
    isReady.value = true
    return
  }
  // Se system, espera o próximo tick para garantir que a classe dark foi aplicada
  if (colorMode.value === 'system') {
    nextTick(() => {
      if (import.meta.client && document.documentElement.classList.contains('dark')) {
        logoSrc.value = logoDark
      }
      else {
        logoSrc.value = logoLight
      }
      isReady.value = true
    })
    return
  }
  logoSrc.value = logoLight
  isReady.value = true
}

onMounted(() => {
  updateLogo()
})

watch(
  () => colorMode.value,
  () => {
    isReady.value = false
    updateLogo()
  },
)
</script>

<template>
  <div>
    <NuxtLink to="/">
      <template v-if="isReady">
        <NuxtImg
          :src="logoSrc"
          :alt="APP_FULL_NAME"
          class="px-2 py-3"
          width="190px"
          loading="eager"
          :placeholder="[50, 25, 75, 5]"
        />
      </template>
      <template v-else>
        <div class="w-[190px] flex items-center gap-3 px-2 py-3">
          <Skeleton class="h-10 w-10 rounded-full" />
          <Skeleton class="h-6 flex-1 rounded-md" />
        </div>
      </template>
    </NuxtLink>
  </div>
</template>

<style></style>
