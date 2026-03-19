import type { ColumnDef } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Badge } from '@/components/ui/badge/index'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export const pipelineColumns: ColumnDef<any>[] = [
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
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Nome do pipeline' }),
    cell: ({ row }) => h('span', { class: 'font-medium text-muted-foreground' }, row.getValue('name')),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Descrição' }),
    cell: ({ row }) => h('span', { class: 'truncate text-xs text-muted-foreground' }, row.getValue('description')),
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Prioridade' }),
    cell: ({ row }) => {
      const priority = row.getValue('priority') || 0
      return h('span', { class: 'text-center font-medium' }, priority.toString())
    },
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row }) => {
      const isActive = row.getValue('is_active')
      return h(Badge, {
        variant: 'secondary',
        class: isActive
          ? 'bg-green-100 text-green-800 hover:bg-green-100'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-100',
      }, () => isActive ? 'Ativo' : 'Inativo')
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'is_default',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Padrão' }),
    cell: ({ row }) => {
      const isDefault = row.original.is_default
      return h('div', { class: 'flex items-center' }, [
        h('span', {
          class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
            isDefault
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-muted text-muted-foreground'
          }`,
        }, [
          h(resolveComponent('Icon'), {
            name: isDefault ? 'lucide:check-circle' : 'lucide:circle',
            class: 'mr-1 h-3.5 w-3.5',
          }),
          isDefault ? 'Padrão' : 'Personalizado',
        ]),
      ])
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) => h(
      DataTableRowActions,
      {
        row,
        onEdit: () => (table.options.meta as any)?.onEdit?.(row.original),
        onDelete: () => (table.options.meta as any)?.onDelete?.(row.original),
      },
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
