<script setup lang="ts">
import type { Column, Table } from '@tanstack/vue-table'
import { computed } from 'vue'

interface DataTableViewOptionsProps {
  table: Table<any>
}

const props = defineProps<DataTableViewOptionsProps>()

/** Fallback PT labels for column ids shown in the column toggle. */
const COLUMN_LABELS: Record<string, string> = {
  title: 'Título',
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  company: 'Empresa',
  company_name: 'Empresa',
  contact_name: 'Contato',
  lead_name: 'Lead',
  status: 'Status',
  type: 'Tipo',
  priority: 'Prioridade',
  source: 'Origem',
  value: 'Valor',
  tags: 'Tags',
  active: 'Ativo',
  price: 'Preço',
  recurrence: 'Recorrência',
  category: 'Categoria',
  category_id: 'Categoria',
  start_time: 'Início',
  end_time: 'Fim',
  created_at: 'Criado em',
  createdAt: 'Criado em',
  updated_at: 'Atualizado em',
  assigned_to: 'Responsável',
  assignedTo: 'Responsável',
  website: 'Site',
  city: 'Cidade',
  position: 'Cargo',
  role: 'Função',
  lastSignInAt: 'Último acesso',
  description: 'Descrição',
  is_default: 'Padrão',
  is_active: 'Ativo',
  order: 'Ordem',
  color: 'Cor',
  access: 'Acesso',
}

const columns = computed(() =>
  props.table.getAllColumns().filter(column => typeof column.accessorFn !== 'undefined' && column.getCanHide()),
)

function columnLabel(column: Column<any, unknown>): string {
  const meta = column.columnDef.meta as { label?: string } | undefined
  if (meta?.label)
    return meta.label
  return COLUMN_LABELS[column.id] ?? column.id.replace(/_/g, ' ')
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="ml-auto hidden h-8 lg:flex">
        <Icon name="i-radix-icons-mixer-horizontal" class="mr-2 h-4 w-4" />
        Visualizar
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[180px]">
      <DropdownMenuLabel>Alternar colunas</DropdownMenuLabel>
      <DropdownMenuSeparator />

      <DropdownMenuCheckboxItem
        v-for="column in columns"
        :key="column.id"
        :checked="column.getIsVisible()"
        @update:checked="value => column.toggleVisibility(!!value)"
      >
        {{ columnLabel(column) }}
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
