import type { ColumnDef } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'

import { Checkbox } from '../ui/checkbox'
import DataTableColumnHeader from './DataTableColumnHeader.vue'
import TenantRowActions from './TenantRowActions.vue'
import { MODULE_LABELS_PT } from '~/constants/modules'

export interface Tenant {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
  email?: string
  role?: string
  modules?: string[]
  hasAllBundle?: boolean
}

export const columns: ColumnDef<any>[] = [
  {
    id: 'select',
    header: ({ table }: any) =>
      h(Checkbox, {
        'checked': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:checked': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Selecionar todos',
        'class': 'translate-y-0.5',
      }),
    cell: ({ row }: any) =>
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
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Nome' }),
    cell: ({ row }: any) => h('span', { class: 'max-w-[500px] truncate font-medium' }, row.getValue('name')),
  },
  {
    accessorKey: 'slug',
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Identificador' }),
    cell: ({ row }: any) => h('span', { class: 'max-w-[300px] truncate text-muted-foreground' }, row.getValue('slug')),
  },
  {
    id: 'modules',
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Módulos' }),
    cell: ({ row }: any) => {
      const tenant = row.original as Tenant
      if (tenant.hasAllBundle)
        return h('span', { class: 'text-sm text-muted-foreground' }, MODULE_LABELS_PT.all)

      const modules = tenant.modules || []
      if (!modules.length)
        return h('span', { class: 'text-sm text-muted-foreground' }, 'Sem módulos')

      return h(
        'div',
        { class: 'flex flex-wrap gap-1 max-w-[280px]' },
        modules.map(moduleName =>
          h(
            'span',
            {
              class: 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground',
            },
            MODULE_LABELS_PT[moduleName] || moduleName,
          ),
        ),
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Status' }),
    cell: ({ row }: any) => {
      const isActive = row.getValue('is_active') as boolean
      return h('div', { class: 'flex w-[100px] items-center' }, [
        h(
          'div',
          {
            class: `inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium ${
              isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
            }`,
          },
          [
            h(resolveComponent('Icon'), {
              name: isActive ? 'lucide:check-circle' : 'lucide:x-circle',
              class: 'mr-1 h-3.5 w-3.5',
            }),
            isActive ? 'Ativa' : 'Inativa',
          ],
        ),
      ])
    },
    filterFn: (row: any, id: string, value: any) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }: any) => h(DataTableColumnHeader, { column, title: 'Criada em' }),
    cell: ({ row }: any) => {
      const date = new Date(row.getValue('created_at'))
      const formatted = new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
      return h('span', { class: 'text-muted-foreground' }, formatted)
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }: any) =>
      h(TenantRowActions, {
        row,
        onEdit: () => table.options.meta?.onEdit?.(row.original),
        onDelete: () => table.options.meta?.onDelete?.(row.original),
        onModules: () => table.options.meta?.onModules?.(row.original),
      }),
  },
]
