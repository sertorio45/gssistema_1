import type { ColumnDef } from '@tanstack/vue-table'
import type { Contact } from '~/types/crm'
import { h } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export const columns: ColumnDef<Contact>[] = [
  {
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:checked': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
      'class': 'translate-y-0.5',
    }),
    cell: ({ row }) => h(Checkbox, {
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
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Name' }),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('name')),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Email' }),
    cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, row.getValue('email')),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'company_name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Company' }),
    cell: ({ row }) => row.getValue('company_name') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'position',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Position' }),
    cell: ({ row }) => row.getValue('position') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Phone' }),
    cell: ({ row }) => row.getValue('phone') || '-',
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'tags',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Tags' }),
    cell: ({ row }) => {
      const tags = row.getValue('tags') as string[]
      if (!tags || tags.length === 0) return '-'

      return h('div', { class: 'flex flex-wrap gap-1' }, [
        ...tags.slice(0, 2).map(tag =>
          h('span', {
            class: 'inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium',
          }, tag),
        ),
        ...(tags.length > 2 ? [h('span', { class: 'text-xs text-muted-foreground' }, `+${tags.length - 2}`)] : []),
      ])
    },
    enableSorting: false,
    enableHiding: true,
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