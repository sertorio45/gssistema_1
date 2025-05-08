<script setup lang="ts">
import { useColorMode } from '#imports'
import { Skeleton } from '@/components/ui/skeleton'
import { nextTick, onMounted, ref, watch } from 'vue'

const colorMode = useColorMode()

const logoLight = 'https://publico.gsstudio.com.br/branding/gsstudio-logotipo-colors-horizontal.svg'
const logoDark = 'https://publico.gsstudio.com.br/branding/gsstudio-logotipo-white-horizontal.svg'

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
      } else {
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

watch(() => colorMode.value, () => {
  isReady.value = false
  updateLogo()
})
</script>

<template>
  <div>
    <NuxtLink to="/">
      <template v-if="isReady">
        <NuxtImg
          :src="logoSrc"
          alt="Logo"
          class="py-3 px-2"
          width="190px"
          loading="eager"
          :placeholder="[50, 25, 75, 5]"
        />
      </template>
      <template v-else>
        <div class="flex items-center gap-3 py-3 px-2 w-[190px]">
          <Skeleton class="w-10 h-10 rounded-full" />
          <Skeleton class="h-6 flex-1 rounded-md" />
        </div>
      </template>
    </NuxtLink>
  </div>
</template>

<style>
</style>