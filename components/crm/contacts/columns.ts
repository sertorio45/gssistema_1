import type { ColumnDef } from '@tanstack/vue-table'
import type { Contact } from '~/types/crm'

import { h } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'

import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export const columns: ColumnDef<Contact>[] = [
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
    accessorKey: 'email',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'E-mail' }),
    cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, row.getValue('email')),
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
    accessorKey: 'position',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Cargo' }),
    cell: ({ row }) => row.getValue('position') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Telefone' }),
    cell: ({ row }) => row.getValue('phone') || '-',
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
