<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'
import { computed } from 'vue'

interface DataTableToolbarProps {
  table: Table<any>
  placeholder?: string
  filterColumn?: string
}
const props = defineProps<DataTableToolbarProps>()
const filterColumn = computed(() => props.filterColumn || 'name')

const isFiltered = computed(() => props.table.getState().columnFilters.length > 0)
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex flex-1 items-center space-x-2">
      <Input
        :placeholder="props.placeholder || 'Filter...'"
        :model-value="(props.table.getColumn(filterColumn)?.getFilterValue() as string) ?? ''"
        class="h-8 w-[150px] lg:w-[250px]"
        @input="props.table.getColumn(filterColumn)?.setFilterValue($event.target.value)"
      />
      <slot name="filters" :table="props.table" />
      <Button
        v-if="isFiltered"
        variant="ghost"
        class="h-8 px-2 lg:px-3"
        @click="props.table.resetColumnFilters()"
      >
        Clear
        <Icon name="lucide:x" class="ml-2 h-4 w-4" />
      </Button>
    </div>
    <slot name="options" :table="props.table" />
  </div>
</template> 