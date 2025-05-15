import type { ColumnDef } from '@tanstack/vue-table'
import { resolveComponent } from '#imports'
import { h } from 'vue'
import { Checkbox } from '../ui/checkbox'
import DataTableColumnHeader from './DataTableColumnHeader.vue'
import DataTableRowActions from './DataTableRowActions.vue'

// User interface
export interface User {
  id: string
  email: string
  role: string
}

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:checked': value => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
      'class': 'translate-y-0.5',
    }),
    cell: ({ row }) => h(Checkbox, {
      'checked': row.getIsSelected(),
      'onUpdate:checked': value => row.toggleSelected(!!value),
      'ariaLabel': 'Select row',
      'class': 'translate-y-0.5',
    }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Email' }),
    cell: ({ row }) => h('span', { class: 'max-w-[500px] truncate font-medium text-muted-foreground' }, row.getValue('email')),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Role' }),
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      
      const roleLabels: Record<string, string> = {
        admin: 'Administrator',
        funcionario: 'Employee',
        cliente: 'Client',
      }
      
      const roleIcons: Record<string, string> = {
        admin: 'lucide:shield',
        funcionario: 'lucide:briefcase',
        cliente: 'lucide:user',
      }
      
      const roleColors: Record<string, string> = {
        admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        funcionario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        cliente: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      }
      
      return h('div', { class: 'flex w-[130px] items-center' }, [
        h('div', {
          class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[role] || ''}`,
        }, [
          h(resolveComponent('Icon'), {
            name: roleIcons[role] || 'lucide:user',
            class: 'mr-1 h-3.5 w-3.5',
          }),
          roleLabels[role] || role,
        ]),
      ])
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => h(DataTableRowActions, { row }),
  },
]
