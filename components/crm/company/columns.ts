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
        'ariaLabel': 'Select all',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        'checked': row.getIsSelected(),
        'onUpdate:checked': (value: boolean) => row.toggleSelected(!!value),
        'ariaLabel': 'Select row',
        'class': 'translate-y-0.5',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Company Name' }),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('name')),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'industry',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Industry' }),
    cell: ({ row }) => row.getValue('industry') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'size',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Size' }),
    cell: ({ row }) => {
      const size = row.getValue('size') as string | undefined
      return size ? size.charAt(0).toUpperCase() + size.slice(1) : '-'
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'contactsCount',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Contacts' }),
    cell: ({ row }) => row.getValue('contactsCount'),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'leadsCount',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Leads' }),
    cell: ({ row }) => row.getValue('leadsCount'),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'totalValue',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Total Value' }),
    cell: ({ row }) => {
      const value = row.getValue('totalValue') as number
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
      }).format(value)
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
