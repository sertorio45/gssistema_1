import type { ColumnDef } from '@tanstack/vue-table'
import type { Company } from '~/types/crm'

import { h } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'

import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export const columns: ColumnDef<Company>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Selecionar todos',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        'checked': row.getIsSelected(),
        'onUpdate:checked': (value: boolean) => row.toggleSelected(!!value),
        'ariaLabel': 'Selecionar linha',
        'class': 'translate-y-0.5',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Nome' }),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('name')),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'website',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Site' }),
    cell: ({ row }) => {
      const website = row.getValue('website') as string | undefined
      if (!website)
        return h('span', { class: 'text-muted-foreground' }, '-')
      return h('span', { class: 'truncate text-muted-foreground' }, website.replace(/^https?:\/\//, ''))
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'city',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Cidade' }),
    cell: ({ row }) => row.getValue('city') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Criada em' }),
    cell: ({ row }) => {
      const rawDate = row.getValue('created_at')
      if (!rawDate)
        return h('span', { class: 'text-sm text-muted-foreground' }, '-')
      const date = new Date(String(rawDate))
      if (Number.isNaN(date.getTime()))
        return h('span', { class: 'text-sm text-muted-foreground' }, '-')
      return h('span', { class: 'text-sm' }, date.toLocaleDateString('pt-BR'))
    },
    enableSorting: true,
    enableHiding: true,
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
