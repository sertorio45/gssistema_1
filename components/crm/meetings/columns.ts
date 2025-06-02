import type { ColumnDef } from '@tanstack/vue-table'
import type { Meeting } from '~/types/crm'
import { h } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

export const columns: ColumnDef<Meeting>[] = [
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
    accessorKey: 'title',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Meeting' }),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('title')),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'type',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Type' }),
    cell: ({ row }) => row.getValue('type'),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row }) => row.getValue('status'),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'startTime',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Date & Time' }),
    cell: ({ row }) => {
      const date = new Date(row.getValue('startTime'))
      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-medium' }, date.toLocaleDateString('pt-BR')),
        h('span', { class: 'text-sm text-muted-foreground' }, date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })),
      ])
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'attendees',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Attendees' }),
    cell: ({ row }) => {
      const attendees = row.getValue('attendees') as string[]
      return attendees.length > 0 ? attendees.join(', ') : '-'
    },
    enableSorting: true,
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