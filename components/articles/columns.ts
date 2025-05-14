import type { ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { h } from 'vue'
import DataTableRowActions from './DataTableRowActions.vue'

export interface Article {
  id: string
  title: string
  status: string
}

export const columns: ColumnDef<Article>[] = [
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
    accessorKey: 'title',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Título' }),
    cell: ({ row }) => h('span', { class: 'max-w-[500px] truncate font-medium text-muted-foreground' }, row.getValue('title')),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row }) => {
      const status = row.getValue('status')
      const isPublished = status === 'published'
      
      return h('div', { class: 'flex w-[100px] items-center' }, [
        h('div', {
          class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
            isPublished 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' 
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
          }`,
        }, [
          h(resolveComponent('Icon'), {
            name: isPublished ? 'lucide:check-circle' : 'lucide:clock',
            class: 'mr-1 h-3.5 w-3.5',
          }),
          isPublished ? 'Publicado' : 'Rascunho',
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