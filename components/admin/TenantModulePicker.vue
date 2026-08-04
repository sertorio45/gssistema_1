<script setup lang="ts">
import {
  ASSIGNABLE_MODULE_SLUGS,
  MODULE_LABELS_PT,
  MODULE_META,
} from '~/constants/modules'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: string[]
  allBundle: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:allBundle': [value: boolean]
}>()

const MODULE_DESCRIPTIONS: Record<string, string> = {
  crm: 'Funil, leads, contatos e vendas',
  article: 'Artigos, categorias e tags',
  marketing: 'Redes sociais, campanhas e calendário',
  whatsapp: 'Inbox, campanhas e automações',
  all: 'Libera todos os módulos para este cliente',
}

function isSelected(slug: string) {
  return props.allBundle || props.modelValue.includes(slug)
}

function toggleAll(enabled: boolean) {
  emit('update:allBundle', enabled)
  if (enabled)
    emit('update:modelValue', [...ASSIGNABLE_MODULE_SLUGS])
}

function toggleSlug(slug: string) {
  if (props.disabled || props.allBundle)
    return

  const set = new Set(props.modelValue)
  if (set.has(slug))
    set.delete(slug)
  else
    set.add(slug)
  emit('update:modelValue', [...set])
}
</script>

<template>
  <div class="space-y-4">
    <button
      type="button"
      class="w-full rounded-xl border p-4 text-left transition-all duration-150"
      :class="cn(
        allBundle
          ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30'
          : 'border-border/70 bg-muted/20 hover:border-border hover:bg-muted/40',
        disabled && 'pointer-events-none opacity-60',
      )"
      :disabled="disabled"
      @click="toggleAll(!allBundle)"
    >
      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 h-10 w-10 flex shrink-0 items-center justify-center rounded-lg border"
          :class="allBundle ? 'border-primary/40 bg-background text-primary' : 'border-border/60 bg-background text-muted-foreground'"
        >
          <Icon name="lucide:layers" class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-semibold">
              {{ MODULE_LABELS_PT.all }}
            </p>
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-full border"
              :class="allBundle ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'"
            >
              <Icon v-if="allBundle" name="lucide:check" class="h-3.5 w-3.5" />
            </span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground leading-relaxed">
            {{ MODULE_DESCRIPTIONS.all }}
          </p>
        </div>
      </div>
    </button>

    <div>
      <p class="mb-2 text-sm font-medium">
        Módulos individuais
      </p>
      <div class="grid gap-2 sm:grid-cols-2">
        <button
          v-for="moduleSlug in ASSIGNABLE_MODULE_SLUGS"
          :key="moduleSlug"
          type="button"
          class="rounded-xl border p-3.5 text-left transition-all duration-150"
          :class="cn(
            isSelected(moduleSlug)
              ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/25'
              : 'border-border/70 bg-background hover:border-border hover:bg-muted/30',
            (disabled || allBundle) && 'pointer-events-none',
            allBundle && 'opacity-70',
            disabled && 'opacity-60',
          )"
          :disabled="disabled || allBundle"
          :aria-pressed="isSelected(moduleSlug)"
          @click="toggleSlug(moduleSlug)"
        >
          <div class="flex items-start gap-3">
            <div
              class="h-9 w-9 flex shrink-0 items-center justify-center rounded-lg border"
              :class="isSelected(moduleSlug)
                ? 'border-primary/40 bg-background text-primary'
                : 'border-border/60 bg-muted/40 text-muted-foreground'"
            >
              <Icon :name="MODULE_META[moduleSlug]?.icon || 'lucide:box'" class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold leading-tight">
                  {{ MODULE_LABELS_PT[moduleSlug] }}
                </p>
                <span
                  class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                  :class="isSelected(moduleSlug)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30'"
                >
                  <Icon v-if="isSelected(moduleSlug)" name="lucide:check" class="h-3.5 w-3.5" />
                </span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground leading-relaxed">
                {{ MODULE_DESCRIPTIONS[moduleSlug] }}
              </p>
              <p
                v-if="isSelected(moduleSlug)"
                class="mt-2 text-[11px] font-medium text-primary"
              >
                Ativo
              </p>
              <p
                v-else
                class="mt-2 text-[11px] font-medium text-muted-foreground"
              >
                Inativo
              </p>
            </div>
          </div>
        </button>
      </div>
      <p v-if="allBundle" class="mt-2 text-xs text-muted-foreground">
        Pacote completo ativo — a seleção individual fica bloqueada.
      </p>
    </div>
  </div>
</template>
