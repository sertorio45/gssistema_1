import type { ColumnDef } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'

import { Checkbox } from '../ui/checkbox'
import DataTableColumnHeader from './DataTableColumnHeader.vue'
import TenantRowActions from './TenantRowActions.vue'

export interface Tenant {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
  email?: string
  role?: string
}

export const columns: ColumnDef<any>[] = [
  {
    id: 'select',
    header: ({ table }: any) =>
      h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Selecionar todos',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }: any) =>
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
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Nome' }),
    cell: ({ row }: any) => h('span', { class: 'max-w-[500px] truncate font-medium' }, row.getValue('name')),
  },
  {
    accessorKey: 'slug',
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Identificador' }),
    cell: ({ row }: any) => h('span', { class: 'max-w-[300px] truncate text-muted-foreground' }, row.getValue('slug')),
  },
  {
    accessorKey: 'is_active',
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row }: any) => {
      const isActive = row.getValue('is_active') as boolean
      return h('div', { class: 'flex w-[100px] items-center' }, [
        h(
          'div',
          {
            class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
              isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
            }`,
          },
          [
            h(resolveComponent('Icon'), {
              name: isActive ? 'lucide:check-circle' : 'lucide:x-circle',
              class: 'mr-1 h-3.5 w-3.5',
            }),
            isActive ? 'Ativa' : 'Inativa',
          ],
        ),
      ])
    },
    filterFn: (row: any, id: string, value: any) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Criada em' }),
    cell: ({ row }: any) => {
      const date = new Date(row.getValue('created_at'))
      const formatted = new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
      return h('span', { class: 'text-muted-foreground' }, formatted)
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }: any) =>
      h(TenantRowActions, {
        row,
        onEdit: () => table.options.meta?.onEdit?.(row.original),
        onDelete: () => table.options.meta?.onDelete?.(row.original),
      }),
  },
]
