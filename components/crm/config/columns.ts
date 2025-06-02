import type { ColumnDef } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export const sourceColumns: ColumnDef<any>[] = [
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
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Source Name' }),
    cell: ({ row }) => h('span', { class: 'font-medium text-muted-foreground' }, row.getValue('name')),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Description' }),
    cell: ({ row }) => h('span', { class: 'truncate text-xs text-muted-foreground' }, row.getValue('description')),
  },
  {
    accessorKey: 'is_default',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Default' }),
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
          isDefault ? 'Default' : 'Custom',
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