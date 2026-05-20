import type { ColumnDef } from '@tanstack/vue-table'
import type { Meeting } from '~/types/crm'

import { h } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'

import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export const columns: ColumnDef<Meeting>[] = [
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
    accessorKey: 'title',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Título' }),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('title')),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'company_name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Empresa' }),
    cell: ({ row }) => row.getValue('company_name') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'contact_name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Contato' }),
    cell: ({ row }) => row.getValue('contact_name') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'lead_name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Lead' }),
    cell: ({ row }) => row.getValue('lead_name') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'type',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Tipo' }),
    cell: ({ row }) => row.getValue('type'),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row }) => row.getValue('status'),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'start_time',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Início' }),
    cell: ({ row }) => new Date(row.getValue('start_time')).toLocaleString('pt-BR'),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'end_time',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Fim' }),
    cell: ({ row }) => new Date(row.getValue('end_time')).toLocaleString('pt-BR'),
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
