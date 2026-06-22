import type { ColumnDef } from '@tanstack/vue-table'
import { resolveComponent } from '#imports'

import { h } from 'vue'

import { Checkbox } from '../ui/checkbox'
import DataTableColumnHeader from './DataTableColumnHeader.vue'
import DataTableRowActions from './DataTableRowActions.vue'
import { ROLE_LABELS, type AppRoleSlug } from '~/constants/roles'

export interface User {
  id: string
  email: string
  role: string
  tenant_id?: string | null
  tenant_name?: string | null
}

export const columns: ColumnDef<User>[] = [
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
    accessorKey: 'email',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'E-mail' }),
    cell: ({ row }) =>
      h('span', { class: 'max-w-[500px] truncate font-medium text-muted-foreground' }, row.getValue('email')),
  },
  {
    accessorKey: 'tenant_name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Empresa' }),
    cell: ({ row }) => h(
      'span',
      { class: 'text-muted-foreground text-sm' },
      row.original.tenant_name || '—',
    ),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Função' }),
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      const isAdmin = role === 'admin'
      const isEmployee = role === 'funcionario'
      const isClient = role === 'cliente'
      const isAttendant = role === 'atendente'
      const label = ROLE_LABELS[role as AppRoleSlug] || role
      return h('div', { class: 'flex w-[180px] items-center' }, [
        h(
          'div',
          {
            class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
              isAdmin
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : isEmployee
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : isClient
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : isAttendant
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
            }`,
          },
          [
            h(resolveComponent('Icon'), {
              name: isAdmin
                ? 'lucide:shield'
                : isEmployee
                  ? 'lucide:briefcase'
                  : isClient
                    ? 'lucide:user-cog'
                    : 'lucide:headphones',
              class: 'mr-1 h-3.5 w-3.5',
            }),
            label,
          ],
        ),
      ])
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) =>
      h(DataTableRowActions, {
        row,
        onEdit: () => table.options.meta?.onEdit?.(row.original),
        onDelete: () => table.options.meta?.onDelete?.(row.original),
      }),
  },
]
