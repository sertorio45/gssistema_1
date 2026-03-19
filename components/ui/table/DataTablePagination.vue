<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}
const props = defineProps<DataTablePaginationProps<any>>()
</script>

<template>
  <div class="flex items-center justify-between px-2">
    <div class="flex-1 text-sm text-muted-foreground">
      {{ props.table.getFilteredSelectedRowModel().rows.length }} of
      {{ props.table.getFilteredRowModel().rows.length }} row(s) selected.
    </div>
    <div class="flex items-center space-x-6 lg:space-x-8">
      <div class="flex items-center space-x-2">
        <p class="text-sm font-medium">
          Rows per page
        </p>
        <Select
          :model-value="String(props.table.getState().pagination.pageSize)"
          @update:model-value="value => props.table.setPageSize(Number(value))"
        >
          <SelectTrigger class="h-8 w-[70px]">
            <SelectValue :placeholder="String(props.table.getState().pagination.pageSize)" />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem v-for="pageSize in [10, 20, 30, 40, 50]" :key="pageSize" :value="String(pageSize)">
              {{ pageSize }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="w-[100px] flex items-center justify-center text-sm font-medium">
        Page {{ props.table.getState().pagination.pageIndex + 1 }} of
        {{ props.table.getPageCount() }}
      </div>
      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          class="hidden h-8 w-8 p-0 lg:flex"
          :disabled="!props.table.getCanPreviousPage()"
          @click="props.table.setPageIndex(0)"
        >
          <span class="sr-only">Go to first page</span>
          <Icon name="lucide:chevrons-left" class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="h-8 w-8 p-0"
          :disabled="!props.table.getCanPreviousPage()"
          @click="props.table.previousPage"
        >
          <span class="sr-only">Go to previous page</span>
          <Icon name="lucide:chevron-left" class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="h-8 w-8 p-0"
          :disabled="!props.table.getCanNextPage()"
          @click="props.table.nextPage"
        >
          <span class="sr-only">Go to next page</span>
          <Icon name="lucide:chevron-right" class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="hidden h-8 w-8 p-0 lg:flex"
          :disabled="!props.table.getCanNextPage()"
          @click="props.table.setPageIndex(props.table.getPageCount() - 1)"
        >
          <span class="sr-only">Go to last page</span>
          <Icon name="lucide:chevrons-right" class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
