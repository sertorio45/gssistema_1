<script setup lang="ts">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const model = defineModel<'thumb' | 'list'>({ default: 'thumb' })
</script>

<template>
  <ToggleGroup
    type="single"
    variant="outline"
    :model-value="model"
    class="justify-start"
    @update:model-value="(value) => { if (value === 'thumb' || value === 'list') model = value }"
  >
    <ToggleGroupItem value="thumb" aria-label="Visualização em miniaturas" title="Miniaturas">
      <Icon name="lucide:layout-grid" class="h-4 w-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="list" aria-label="Visualização em lista" title="Lista">
      <Icon name="lucide:list" class="h-4 w-4" />
    </ToggleGroupItem>
  </ToggleGroup>
</template>
