<script setup lang="ts">
import type { CrmLeadLookupResult } from '~/types/crm'
import { useDebounceFn } from '@vueuse/core'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import Input from '~/components/ui/input/Input.vue'
import { useTenant } from '~/composables/useTenant'

const props = withDefaults(
  defineProps<{
    modelValue: string
    excludeLeadId?: string | null
    placeholder?: string
    inputId?: string
    required?: boolean
    searchField?: 'lead' | 'contact'
  }>(),
  {
    excludeLeadId: null,
    placeholder: 'Nome',
    inputId: 'lead-name',
    required: false,
    searchField: 'lead',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'autofill': [match: CrmLeadLookupResult, scope: 'lead' | 'contact']
}>()

const { tenantId } = useTenant()
const open = ref(false)
const loading = ref(false)
const suggestions = ref<CrmLeadLookupResult[]>([])
const lastAppliedKey = ref<string | null>(null)
const isSelecting = ref(false)

function getMatchKey(match: CrmLeadLookupResult) {
  return `${match.match_type}:${match.id}:${match.email || ''}:${match.phone || ''}`
}

function getDisplayLabel(match: CrmLeadLookupResult) {
  const parts = [match.name]
  if (match.email)
    parts.push(match.email)
  if (match.phone)
    parts.push(match.phone)
  if (match.company_name)
    parts.push(match.company_name)
  return parts.join(' · ')
}

async function fetchSuggestions(query: string) {
  if (!tenantId.value || query.trim().length < 2) {
    suggestions.value = []
    open.value = false
    return
  }

  loading.value = true
  try {
    const response = await $fetch<{ data: CrmLeadLookupResult[] }>('/api/crm/lead/lookup', {
      query: {
        tenant_id: tenantId.value,
        q: query.trim(),
        exclude_lead_id: props.excludeLeadId || undefined,
      },
    })

    suggestions.value = response.data || []
    open.value = suggestions.value.length > 0

    const normalizedQuery = query.trim().toLowerCase()
    const exactMatches = suggestions.value.filter((item) => {
      const leadName = item.name.toLowerCase()
      const contactName = item.contact_name?.toLowerCase() || ''
      return leadName === normalizedQuery || contactName === normalizedQuery
    })

    if (exactMatches.length === 1 && !props.excludeLeadId) {
      const match = exactMatches[0]
      const matchKey = getMatchKey(match)
      if (lastAppliedKey.value !== matchKey)
        applySuggestion(match, true)
    }
  }
  catch {
    suggestions.value = []
    open.value = false
  }
  finally {
    loading.value = false
  }
}

const debouncedSearch = useDebounceFn((query: string) => {
  if (isSelecting.value)
    return
  fetchSuggestions(query)
}, 400)

function handleValueUpdate(value: string | number) {
  const nextValue = String(value)
  lastAppliedKey.value = null
  emit('update:modelValue', nextValue)
  debouncedSearch(nextValue)
}

function applySuggestion(match: CrmLeadLookupResult, silent = false) {
  isSelecting.value = true
  lastAppliedKey.value = getMatchKey(match)
  const resolvedName = props.searchField === 'contact'
    ? (match.contact_name || match.name)
    : match.name

  emit('update:modelValue', resolvedName)
  emit('autofill', match, props.searchField)
  open.value = false
  suggestions.value = []

  if (!silent)
    toast.success('Dados preenchidos automaticamente.')

  window.setTimeout(() => {
    isSelecting.value = false
  }, 0)
}

function handleBlur() {
  window.setTimeout(() => {
    open.value = false
  }, 150)
}

watch(() => props.modelValue, (value, previousValue) => {
  if (isSelecting.value || value === previousValue)
    return

  if (!value.trim()) {
    suggestions.value = []
    open.value = false
    lastAppliedKey.value = null
  }
})
</script>

<template>
  <div class="relative">
    <Input
      :id="inputId"
      :model-value="modelValue"
      :placeholder="placeholder"
      :required="required"
      autocomplete="off"
      @update:model-value="handleValueUpdate"
      @focus="debouncedSearch(modelValue)"
      @blur="handleBlur"
    />

    <div
      v-if="open && suggestions.length > 0"
      class="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto border rounded-md bg-popover shadow-md"
    >
      <button
        v-for="match in suggestions"
        :key="getMatchKey(match)"
        type="button"
        class="w-full px-3 py-2 text-left text-sm transition hover:bg-muted"
        @mousedown.prevent="applySuggestion(match)"
      >
        <span class="block font-medium">{{ match.name }}</span>
        <span class="block truncate text-xs text-muted-foreground">
          {{ getDisplayLabel(match) }}
        </span>
      </button>
    </div>

    <p v-if="loading" class="mt-1 text-xs text-muted-foreground">
      Buscando registros...
    </p>
  </div>
</template>
