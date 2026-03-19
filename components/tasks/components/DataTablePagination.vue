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
      {{ table.getFilteredSelectedRowModel().rows.length }} de {{ table.getFilteredRowModel().rows.length }} linha(s)
      selecionada(s).
    </div>
    <div class="flex items-center space-x-6 lg:space-x-8">
      <div class="flex items-center space-x-2">
        <p class="text-sm font-medium">
          Linhas por página
        </p>
        <Select
          :model-value="String(table.getState().pagination.pageSize)"
          :options="['10', '20', '30', '40', '50']"
          @update:model-value="value => table.setPageSize(Number(value))"
        >
          <SelectTrigger class="h-8 w-[70px]">
            <SelectValue :placeholder="String(table.getState().pagination.pageSize)" />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem v-for="pageSize in [10, 20, 30, 40, 50]" :key="pageSize" :value="String(pageSize)">
              {{ pageSize }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="w-[100px] flex items-center justify-center text-sm font-medium">
        Página {{ table.getState().pagination.pageIndex + 1 }} de
        {{ table.getPageCount() }}
      </div>
      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          class="hidden h-8 w-8 p-0 lg:flex"
          :disabled="!table.getCanPreviousPage()"
          @click="table.setPageIndex(0)"
        >
          <span class="sr-only">Ir para primeira página</span>
          <Icon name="lucide:chevrons-left" class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="h-8 w-8 p-0"
          :disabled="!table.getCanPreviousPage()"
          @click="table.previousPage"
        >
          <span class="sr-only">Ir para página anterior</span>
          <Icon name="lucide:chevron-left" class="h-4 w-4" />
        </Button>
        <Button variant="outline" class="h-8 w-8 p-0" :disabled="!table.getCanNextPage()" @click="table.nextPage">
          <span class="sr-only">Ir para próxima página</span>
          <Icon name="lucide:chevron-right" class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="hidden h-8 w-8 p-0 lg:flex"
          :disabled="!table.getCanNextPage()"
          @click="table.setPageIndex(table.getPageCount() - 1)"
        >
          <span class="sr-only">Ir para última página</span>
          <Icon name="lucide:chevrons-right" class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
