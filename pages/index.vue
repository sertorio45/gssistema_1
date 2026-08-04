<script setup lang="ts">
import type { HubAttentionItem, HubModuleTile } from '~/composables/useHubHome'

import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import { useHubHome } from '~/composables/useHubHome'
import { resolveSafeRedirect } from '~/utils/safe-redirect'

definePageMeta({
  middleware: ['auth'],
  title: 'Início',
})

useSeoMeta({
  title: 'Início',
  description: 'Hub de soluções Blimber — atalhos por módulo e papel.',
})

const route = useRoute()

// Destructure so template auto-unwraps refs/computeds (hub.xxx nested refs break v-for).
const {
  isReady,
  isLoading,
  persona,
  moduleTiles,
  actions,
  roleLabel,
  greetingName,
  tenantName,
  organizationName,
  landingPath,
  shouldAutoEnter,
  attentionItems,
  attentionPending,
  attentionSkeleton,
  refreshAttention,
  preferredDestination,
  continueItems,
  showContinue,
  setPreferredModule,
  setPreferredPath,
  clearPreferred,
  ensureReady,
  openModule,
} = useHubHome()

const entering = ref(true)

const showSkeleton = computed(() => (isLoading.value || entering.value) && !isReady.value)

const showAttention = computed(() =>
  attentionSkeleton.value || attentionItems.value.length > 0,
)

const personaBlurb = computed(() => {
  switch (persona.value) {
    case 'staff':
      return 'Central da plataforma — saúde dos tenants, convites e integrações.'
    case 'agency':
      return 'Hub da agência — carteira, onboarding e produção.'
    case 'attendant':
      return 'Sua fila de atendimento — WhatsApp e CRM.'
    default:
      return 'Seu hub na empresa — entre nos módulos liberados.'
  }
})

function attentionToneClass(item: HubAttentionItem): string {
  if (item.tone === 'danger')
    return 'border-destructive/40 bg-destructive/5'
  if (item.tone === 'warning')
    return 'border-amber-500/40 bg-amber-500/5'
  return 'border-border bg-card'
}

function formatCount(count: number): string {
  if (count > 999)
    return '999+'
  return String(count)
}

function isPreferredPath(to: string): boolean {
  return preferredDestination.value?.to === to
}

function isPreferredModule(tile: HubModuleTile): boolean {
  const preferred = preferredDestination.value?.to
  if (!preferred)
    return false
  if (preferred === tile.to)
    return true
  const base = tile.to.replace(/\/(dashboard)?$/, '') || tile.to
  return preferred === base || preferred.startsWith(`${base}/`)
}

onMounted(async () => {
  try {
    await ensureReady()

    const queried = resolveSafeRedirect(route.query.redirect)
    if (route.query.redirect && queried !== '/') {
      await navigateTo(queried, { replace: true })
      return
    }

    if (shouldAutoEnter.value) {
      await navigateTo(landingPath.value, { replace: true })
      return
    }
  }
  finally {
    entering.value = false
  }
})

async function goAction(to: string) {
  if (!to)
    return
  await navigateTo(to)
}

async function goModule(tile: HubModuleTile) {
  await openModule(tile)
}

function markPreferredModule(tile: HubModuleTile, event: Event) {
  event.stopPropagation()
  setPreferredModule(tile)
  toast.success(`${tile.title} definido como padrão`)
}

function markPreferredPath(to: string, title: string, icon: string, event?: Event) {
  event?.stopPropagation()
  setPreferredPath(to, title, icon)
  toast.success(`${title} marcado como destino preferido`)
}

function onClearPreferred(event?: Event) {
  event?.stopPropagation()
  clearPreferred()
  toast.message('Destino padrão removido')
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-8">
    <div v-if="showSkeleton" class="space-y-6">
      <div class="space-y-2">
        <Skeleton class="h-8 w-64" />
        <Skeleton class="h-4 w-96 max-w-full" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton v-for="n in 3" :key="n" class="h-20 rounded-xl" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton v-for="n in 4" :key="`a-${n}`" class="h-24 rounded-xl" />
      </div>
    </div>

    <template v-else>
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">
            {{ roleLabel }}
            <span v-if="organizationName"> · {{ organizationName }}</span>
          </p>
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
            Olá, {{ greetingName }}
          </h1>
          <p class="max-w-2xl text-muted-foreground">
            {{ personaBlurb }}
            <span v-if="tenantName"> Empresa: <span class="text-foreground">{{ tenantName }}</span></span>
          </p>
        </div>
      </header>

      <section v-if="showContinue" class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">
          Continuar de onde parou
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-if="preferredDestination"
            role="button"
            tabindex="0"
            class="group relative flex cursor-pointer items-start gap-3 rounded-xl border border-primary/40 bg-card p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="goAction(preferredDestination.to)"
            @keydown.enter="goAction(preferredDestination.to)"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon :name="preferredDestination.icon" class="h-4 w-4 text-primary" />
            </div>
            <div class="min-w-0 flex-1 space-y-1 pr-6">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium leading-snug">
                  {{ preferredDestination.title }}
                </p>
                <span class="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  Padrão
                </span>
              </div>
              <p class="text-xs text-muted-foreground">
                Seu destino preferido
              </p>
            </div>
            <button
              type="button"
              class="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Remover padrão"
              @click="onClearPreferred($event)"
            >
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
            </button>
          </div>

          <div
            v-for="item in continueItems"
            :key="item.to"
            role="button"
            tabindex="0"
            class="group relative flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="goAction(item.to)"
            @keydown.enter="goAction(item.to)"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon :name="item.icon" class="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div class="min-w-0 flex-1 space-y-1 pr-6">
              <p class="text-sm font-medium leading-snug">
                {{ item.title }}
              </p>
              <p class="text-xs text-muted-foreground">
                Visitado recentemente
              </p>
            </div>
            <button
              type="button"
              class="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              title="Definir como padrão"
              @click="markPreferredPath(item.to, item.title, item.icon, $event)"
            >
              <Icon name="lucide:star" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section v-if="actions.length" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-muted-foreground">
            Ações do dia
          </h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="action in actions"
            :key="action.to + action.title"
            role="button"
            tabindex="0"
            class="group relative flex cursor-pointer flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="action.primary || isPreferredPath(action.to) ? 'border-primary/40' : 'border-border'"
            @click="goAction(action.to)"
            @keydown.enter="goAction(action.to)"
          >
            <div class="flex w-full items-center gap-2">
              <Icon :name="action.icon" class="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              <span class="text-sm font-medium">{{ action.title }}</span>
              <button
                v-if="persona === 'staff'"
                type="button"
                class="ml-auto rounded-md p-1 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground"
                :class="isPreferredPath(action.to) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                :title="isPreferredPath(action.to) ? 'Remover padrão' : 'Definir como padrão'"
                @click="isPreferredPath(action.to)
                  ? onClearPreferred($event)
                  : markPreferredPath(action.to, action.title, action.icon, $event)"
              >
                <Icon
                  name="lucide:star"
                  class="h-3.5 w-3.5"
                  :class="isPreferredPath(action.to) ? 'fill-current text-primary' : ''"
                />
              </button>
            </div>
            <span class="text-xs text-muted-foreground">{{ action.description }}</span>
          </div>
        </div>
      </section>

      <section v-if="showAttention" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-muted-foreground">
            Atenção agora
          </h2>
          <Button
            variant="ghost"
            size="sm"
            class="h-8 px-2 text-xs"
            :disabled="attentionPending"
            @click="refreshAttention()"
          >
            Atualizar
          </Button>
        </div>

        <div v-if="attentionSkeleton" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton v-for="n in 3" :key="`att-${n}`" class="h-20 rounded-xl" />
        </div>

        <div
          v-else
          class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <button
            v-for="item in attentionItems"
            :key="item.id"
            type="button"
            class="group flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="attentionToneClass(item)"
            @click="goAction(item.to)"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80">
              <Icon :name="item.icon" class="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="text-sm font-medium leading-snug">
                  {{ item.title }}
                </p>
                <span class="tabular-nums text-lg font-semibold leading-none">
                  {{ formatCount(item.count) }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ item.description }}
              </p>
            </div>
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">
          Módulos
        </h2>

        <div
          v-if="!moduleTiles.length && persona !== 'staff' && persona !== 'agency'"
          class="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
        >
          Nenhum módulo ativo nesta empresa. Peça ao administrador para liberar CRM, Marketing ou WhatsApp.
        </div>

        <div
          v-else-if="persona === 'agency' && !moduleTiles.length"
          class="rounded-xl border bg-card p-5"
        >
          <p class="text-sm text-muted-foreground">
            Use a visão da agência para clientes e operações. Os módulos aparecem ao abrir o ambiente de um cliente.
          </p>
          <Button class="mt-4" @click="goAction('/organization')">
            Ir para visão da agência
          </Button>
        </div>

        <div
          v-else-if="persona === 'staff' && !moduleTiles.length"
          class="rounded-xl border bg-card p-5"
        >
          <p class="text-sm text-muted-foreground">
            Selecione uma empresa no seletor da barra lateral para operar CRM, Marketing ou WhatsApp. Sem contexto de tenant, use as ações da plataforma acima.
          </p>
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2">
          <div
            v-for="tile in moduleTiles"
            :key="tile.slug"
            role="button"
            tabindex="0"
            class="group relative flex cursor-pointer items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="isPreferredModule(tile) ? 'border-primary/40' : 'border-border'"
            @click="goModule(tile)"
            @keydown.enter="goModule(tile)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon :name="tile.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <p class="font-medium leading-none">
                {{ tile.title }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ tile.description }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-md p-1 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground"
              :class="isPreferredModule(tile) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
              :title="isPreferredModule(tile) ? 'Remover padrão' : 'Definir como módulo padrão'"
              @click="isPreferredModule(tile)
                ? onClearPreferred($event)
                : markPreferredModule(tile, $event)"
            >
              <Icon
                name="lucide:star"
                class="h-4 w-4"
                :class="isPreferredModule(tile) ? 'fill-current text-primary' : ''"
              />
            </button>
            <Icon name="lucide:arrow-right" class="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </div>

        <div
          v-if="persona === 'staff' && moduleTiles.length"
          class="text-xs text-muted-foreground"
        >
          Módulos da empresa selecionada. Use o seletor na barra lateral para trocar de contexto.
        </div>
      </section>

      <section
        v-if="persona === 'staff'"
        class="rounded-xl border bg-card p-5"
      >
        <h2 class="text-sm font-medium">
          Plataforma
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Administração global do hub. Prefira abrir uma empresa pelo seletor para operar CRM, Marketing ou WhatsApp. Use a estrela nas ações/módulos para marcar o destino padrão.
        </p>
      </section>
    </template>
  </div>
</template>
