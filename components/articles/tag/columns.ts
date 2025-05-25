import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from './DataTableRowActions.vue'

export interface Tag {
  id: string
  name: string
  slug: string
  is_active: boolean
}

export function columns(emit: (event: 'edit' | 'delete', tag: Tag) => void): ColumnDef<Tag>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': value => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Selecionar tudo',
        'class': 'translate-y-0.5',
      }),
      cell: ({ row }) => h(Checkbox, {
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
      cell: ({ row }) => h('span', { class: 'max-w-[500px] truncate font-medium text-muted-foreground' }, row.getValue('name')),
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Slug' }),
      cell: ({ row }) => h('span', { class: 'max-w-[500px] truncate text-xs text-muted-foreground' }, row.getValue('slug')),
    },
    {
      accessorKey: 'is_active',
      header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Status' }),
      cell: ({ row }) => {
        const isActive = row.getValue('is_active')
        return h('div', { class: 'flex w-[100px] items-center' }, [
          h('div', {
            class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
              isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
            }`,
          }, [
            h(resolveComponent('Icon'), {
              name: isActive ? 'lucide:check-circle' : 'lucide:x-circle',
              class: 'mr-1 h-3.5 w-3.5',
            }),
            isActive ? 'Ativo' : 'Inativo',
          ]),
        ])
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => h(DataTableRowActions, {
        row,
        onEdit: () => emit('edit', row.original),
        onDelete: () => emit('delete', row.original),
      }),
    },
  ]
}
