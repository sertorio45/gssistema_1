import type { ColumnDef } from '@tanstack/vue-table'
import type { LeadSource } from '~/types/crm'

import { h, resolveComponent } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'
import { formatLeadValueRange } from '~/composables/crm/useCrmLeadValue'

const statusOptions = [
  { value: 'new', label: 'Novo', color: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'contacted', label: 'Contatado', color: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'qualified', label: 'Qualificado', color: 'border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  { value: 'proposal', label: 'Proposta', color: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'negotiation', label: 'Negociação', color: 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'won', label: 'Ganho', color: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'lost', label: 'Perdido', color: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
]

const priorityOptions = [
  { value: 'low', label: 'Baixa', color: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'medium', label: 'Média', color: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'high', label: 'Alta', color: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
]

const sourceOptions = [
  { value: 'website', label: 'Site' },
  { value: 'referral', label: 'Indicação' },
  { value: 'social', label: 'Redes Sociais' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'other', label: 'Outros' },
]

function resolveStatusBadge(row: { getValue: (key: string) => unknown, original: Record<string, unknown> }, table: { options: { meta?: Record<string, unknown> } }) {
  const getStage = table.options.meta?.getStage as
    | ((id?: string | null) => { name: string, color?: string } | null | undefined)
    | undefined

  const stageId = (row.original.sales_stage_id || row.getValue('sales_stage_id')) as string | null | undefined
  const stage = getStage?.(stageId)

  if (stage?.name) {
    const stageColor = stage.color
      ? undefined
      : 'border-transparent bg-muted text-foreground'
    return {
      label: stage.name,
      class: stageColor,
      style: stage.color
        ? {
            backgroundColor: `${stage.color}22`,
            color: stage.color,
            borderColor: `${stage.color}55`,
          }
        : undefined,
    }
  }

  const status = statusOptions.find(s => s.value === row.getValue('status'))
  if (!status)
    return null

  return {
    label: status.label,
    class: status.color,
    style: undefined,
  }
}

export const columns: ColumnDef<any>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': value => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Selecionar todos',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        'checked': row.getIsSelected(),
        'onUpdate:checked': value => row.toggleSelected(!!value),
        'ariaLabel': 'Selecionar linha',
        'class': 'translate-y-0.5',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Nome' }),
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-medium' }, row.getValue('name')),
        h('span', { class: 'text-sm text-muted-foreground' }, row.original.email),
      ])
    },
  },
  {
    accessorKey: 'company',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Empresa' }),
    cell: ({ row }) => h('span', row.getValue('company') || '-'),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row, table }) => {
      const badge = resolveStatusBadge(row, table)
      if (!badge)
        return h('span', { class: 'text-sm text-muted-foreground' }, '-')

      return h(
        Badge,
        {
          variant: 'outline',
          class: ['font-medium', badge.class].filter(Boolean).join(' '),
          style: badge.style,
        },
        () => badge.label,
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Prioridade' }),
    cell: ({ row }) => {
      const priority = priorityOptions.find(p => p.value === row.getValue('priority'))
      if (!priority)
        return null

      return h(
        Badge,
        {
          variant: 'outline',
          class: priority.color,
        },
        () => priority.label,
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'source',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Origem' }),
    cell: ({ row }) => {
      const source = sourceOptions.find(s => s.value === row.getValue('source'))
      return h('span', { class: 'capitalize' }, source?.label || row.getValue('source'))
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'value',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Valor' }),
    cell: ({ row }) => {
      const lead = row.original as { value?: number, values?: number[] }
      return h(
        'span',
        { class: 'font-medium' },
        formatLeadValueRange(lead.values, lead.value),
      )
    },
  },
  {
    accessorKey: 'assigned_to',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Responsável' }),
    cell: ({ row, table }) => {
      const userId = row.getValue('assigned_to') || row.original.assignedTo
      const getMemberName = (table.options.meta as { getMemberName?: (id?: string | null) => string })?.getMemberName
      const label = getMemberName ? getMemberName(userId as string | null) : (userId || 'Não atribuído')
      return h('span', label)
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Criado em' }),
    cell: ({ row }) => {
      const rawDate = row.getValue('created_at') || row.original.createdAt
      if (!rawDate)
        return h('span', { class: 'text-sm text-muted-foreground' }, '-')
      const date = new Date(String(rawDate))
      if (Number.isNaN(date.getTime()))
        return h('span', { class: 'text-sm text-muted-foreground' }, '-')
      return h('span', { class: 'text-sm' }, date.toLocaleDateString('pt-BR'))
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) =>
      h(DataTableRowActions, {
        row,
        onEdit: () => (table.options.meta as any)?.onEdit?.(row.original),
        onDelete: () => (table.options.meta as any)?.onDelete?.(row.original),
      }),
  },
]

export const sourceColumns: ColumnDef<LeadSource>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': value => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Selecionar todos',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        'checked': row.getIsSelected(),
        'onUpdate:checked': value => row.toggleSelected(!!value),
        'ariaLabel': 'Selecionar linha',
        'class': 'translate-y-0.5',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Nome da origem' }),
    cell: ({ row }) => h('span', { class: 'font-medium text-muted-foreground' }, row.getValue('name')),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Descrição' }),
    cell: ({ row }) => h('span', { class: 'truncate text-xs text-muted-foreground' }, row.getValue('description')),
  },
  {
    accessorKey: 'is_default',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Padrão' }),
    cell: ({ row }) => {
      const isDefault = row.original.is_default
      return h('div', { class: 'flex items-center' }, [
        h(
          'span',
          {
            class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
              isDefault
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-muted text-muted-foreground'
            }`,
          },
          [
            h(resolveComponent('Icon'), {
              name: isDefault ? 'lucide:check-circle' : 'lucide:circle',
              class: 'mr-1 h-3.5 w-3.5',
            }),
            isDefault ? 'Padrão' : 'Personalizado',
          ],
        ),
      ])
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) =>
      h(DataTableRowActions, {
        row,
        onEdit: () => (table.options.meta as any)?.onEdit?.(row.original),
        onDelete: () => (table.options.meta as any)?.onDelete?.(row.original),
      }),
    enableSorting: false,
    enableHiding: false,
  },
]

export { priorityOptions, sourceOptions, statusOptions }
