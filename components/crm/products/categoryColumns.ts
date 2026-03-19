import type { ColumnDef } from '@tanstack/vue-table'
import type { ProductCategory } from '~/types/crm'

import { h, resolveComponent } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Checkbox } from '@/components/ui/checkbox'
import Button from '@/components/ui/button/Button.vue'

export const categoryColumns: ColumnDef<ProductCategory>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Selecionar todos',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }) =>
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
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Nome' }),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('name')),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as {
        onEdit?: (row: ProductCategory) => void
        onDelete?: (row: ProductCategory) => void
      }
      const category = row.original as ProductCategory
      const Icon = resolveComponent('Icon')
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(Button, {
          variant: 'ghost',
          size: 'icon',
          class: 'h-8 w-8 text-muted-foreground hover:text-primary',
          onClick: () => meta.onEdit?.(category),
        }, () => [
          h(Icon, { name: 'lucide:pencil', class: 'h-4 w-4' }),
          h('span', { class: 'sr-only' }, 'Editar'),
        ]),
        h(Button, {
          variant: 'ghost',
          size: 'icon',
          class: 'h-8 w-8 text-muted-foreground hover:text-destructive',
          onClick: () => meta.onDelete?.(category),
        }, () => [
          h(Icon, { name: 'lucide:trash-2', class: 'h-4 w-4' }),
          h('span', { class: 'sr-only' }, 'Excluir'),
        ]),
      ])
    },
    enableSorting: false,
    enableHiding: false,
  },
]
