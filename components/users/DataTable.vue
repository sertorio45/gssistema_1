<script setup lang="ts">
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { User } from './columns'
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

import { computed, ref, watch } from 'vue'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DataTablePagination from './DataTablePagination.vue'
import DataTableToolbar from './DataTableToolbar.vue'

interface DataTableProps {
  columns: ColumnDef<User, any>[]
  data: User[]
}
const props = defineProps<DataTableProps>()
const emit = defineEmits(['delete', 'edit', 'selectionChange'])

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref<Record<string, boolean>>({})

// Watch for row selection changes and emit event
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
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  onSortingChange: (updater) => {
    if (typeof updater === 'function') {
      sorting.value = updater(sorting.value)
    }
    else {
      sorting.value = updater
    }
  },
  onColumnFiltersChange: (updater) => {
    if (typeof updater === 'function') {
      columnFilters.value = updater(columnFilters.value)
    }
    else {
      columnFilters.value = updater
    }
  },
  onColumnVisibilityChange: (updater) => {
    if (typeof updater === 'function') {
      columnVisibility.value = updater(columnVisibility.value)
    }
    else {
      columnVisibility.value = updater
    }
  },
  onRowSelectionChange: (updater) => {
    if (typeof updater === 'function') {
      rowSelection.value = updater(rowSelection.value)
    }
    else {
      rowSelection.value = updater
    }
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
  meta: {
    onEdit: (user: User) => emit('edit', user),
    onDelete: (user: User) => emit('delete', user),
  },
})

// Function to create role badge display format
function _getRoleBadge(role: string) {
  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    funcionario: 'Employee',
    cliente: 'Client',
  }

  const roleIcons: Record<string, string> = {
    admin: 'lucide:shield',
    funcionario: 'lucide:briefcase',
    cliente: 'lucide:user',
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    funcionario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    cliente: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  }

  return {
    label: roleLabels[role] || role,
    icon: roleIcons[role] || 'lucide:user',
    color: roleColors[role] || '',
  }
}

// Check if all rows are selected
const _isAllSelected = computed(() => {
  return Object.keys(rowSelection.value).length === props.data.length && props.data.length > 0
})

// Check if some rows are selected
const _isSomeSelected = computed(() => {
  return Object.keys(rowSelection.value).length > 0 && Object.keys(rowSelection.value).length < props.data.length
})

// Clear selection when data changes
watch(
  () => props.data,
  () => {
    if (rowSelection.value) {
      Object.keys(rowSelection.value).forEach((key) => {
        delete rowSelection.value[key]
      })
    }
    emit('selectionChange', [])
  },
)
</script>

<template>
  <div class="space-y-4">
    <DataTableToolbar :table="table" />
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
              No items found.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DataTablePagination :table="table" />
  </div>
</template>
