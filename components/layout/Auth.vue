<script setup lang="ts">
import { APP_FULL_NAME } from '~/constants/app'

defineProps<{
  reverse?: boolean
}>()
</script>

<template>
  <div
    class="relative flex items-center justify-center px-4 h-dvh lg:max-w-none lg:px-0"
    :class="{ 'flex-row-reverse': reverse }"
  >
    <div class="relative hidden h-full flex-1 flex-col bg-muted p-10 text-white lg:flex dark:border-r">
      <div class="absolute inset-0 bg-zinc-900" />
      <div class="relative z-20 flex items-center">
        <NuxtImg
          src="/logotipo-white.svg"
          :alt="APP_FULL_NAME"
          width="190"
          class="max-w-[190px]"
          loading="eager"
        />
      </div>
      <div class="relative z-20 mt-auto">
        <blockquote class="space-y-2">
          <p class="text-lg text-white/90">
            &ldquo;Centralize CRM, atendimento WhatsApp e gestão da sua equipe em um único hub.&rdquo;
          </p>
          <footer class="text-sm text-white/70">
            {{ APP_FULL_NAME }}
          </footer>
        </blockquote>
      </div>
    </div>
    <div class="mx-auto flex-1 lg:p-8">
      <slot />
    </div>
  </div>
</template>

<style scoped></style>
