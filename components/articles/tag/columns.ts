import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'

import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export interface ArticleTag {
  id: number
  title: string | null
  slug: string | null
  publish_status: 'published' | 'draft' | 'arquived' | 'scheduled' | null
  tenant_id: string
  description: string | null
  created_at: string
}

export const columns: ColumnDef<ArticleTag>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': value => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        'checked': row.getIsSelected(),
        'onUpdate:checked': value => row.toggleSelected(!!value),
        'ariaLabel': 'Select row',
        'class': 'translate-y-0.5',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Title' }),
    cell: ({ row }) =>
      h('span', { class: 'max-w-[300px] truncate font-medium text-muted-foreground' }, row.getValue('title')),
  },
  {
    accessorKey: 'slug',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Slug' }),
    cell: ({ row }) => h('span', { class: 'max-w-[200px] truncate text-muted-foreground' }, row.getValue('slug')),
  },
  {
    accessorKey: 'publish_status',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row }) => {
      const publish_status = row.getValue('publish_status')
      const isPublished = publish_status === 'published'
      return h('div', { class: 'flex w-[100px] items-center' }, [
        h(
          'div',
          {
            class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
              isPublished
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
            }`,
          },
          [
            h(resolveComponent('Icon'), {
              name: isPublished ? 'lucide:check-circle' : 'lucide:clock',
              class: 'mr-1 h-3.5 w-3.5',
            }),
            isPublished ? 'Published' : 'Draft',
          ],
        ),
      ])
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'description',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Description' }),
    cell: ({ row }) =>
      h('span', { class: 'max-w-[300px] truncate text-muted-foreground' }, row.getValue('description')),
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
