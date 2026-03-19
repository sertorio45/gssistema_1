<script setup lang="ts">
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/vue-table'
import {
  FlexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ref, watch } from 'vue'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './index'

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[]
  data: T[]
  meta?: any
}
const props = defineProps<DataTableProps<any>>()
const emit = defineEmits(['edit', 'delete', 'selectionChange'])

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref<Record<string, boolean>>({})

watch(
  rowSelection,
  () => {
    const selectedIndices = Object.keys(rowSelection.value).map(Number)
    emit('selectionChange', selectedIndices)
  },
  { deep: true },
)

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  state: {
    get sorting() {
      return sorting.value
    },
    get columnFilters() {
      return columnFilters.value
    },
    get columnVisibility() {
      return columnVisibility.value
    },
    get rowSelection() {
      return rowSelection.value
    },
  },
  enableRowSelection: true,
  onSortingChange: (updaterOrValue) => {
    if (typeof updaterOrValue === 'function') {
      sorting.value = updaterOrValue(sorting.value)
    }
    else {
      sorting.value = updaterOrValue
    }
  },
  onColumnFiltersChange: (updaterOrValue) => {
    if (typeof updaterOrValue === 'function') {
      columnFilters.value = updaterOrValue(columnFilters.value)
    }
    else {
      columnFilters.value = updaterOrValue
    }
  },
  onColumnVisibilityChange: (updaterOrValue) => {
    if (typeof updaterOrValue === 'function') {
      columnVisibility.value = updaterOrValue(columnVisibility.value)
    }
    else {
      columnVisibility.value = updaterOrValue
    }
  },
  onRowSelectionChange: (updaterOrValue) => {
    if (typeof updaterOrValue === 'function') {
      rowSelection.value = updaterOrValue(rowSelection.value)
    }
    else {
      rowSelection.value = updaterOrValue
    }
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  meta: props.meta,
})
</script>

<template>
  <div class="space-y-4">
    <slot name="toolbar" :table="table" />
    <div class="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead v-for="header in headerGroup.headers" :key="header.id">
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() && 'selected'"
            >
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>

          <TableRow v-else>
            <TableCell :colspan="props.columns.length" class="h-24 text-center">
              Nenhum resultado encontrado.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <slot name="pagination" :table="table" />
  </div>
</template>
