import type { ColumnDef } from '@tanstack/vue-table'
import type { WhatsAppContact } from '~/types/whatsapp'

import { h } from 'vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  return phone
}

export const columns: ColumnDef<WhatsAppContact>[] = [
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
    cell: ({ row, table }) =>
      h(
        'button',
        {
          type: 'button',
          class: 'text-left font-medium hover:underline',
          onClick: () => (table.options.meta as any)?.onView?.(row.original),
        },
        row.original.name || '—',
      ),
    enableSorting: true,
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Telefone' }),
    cell: ({ row }) => formatPhone(row.getValue('phone') as string),
    enableSorting: true,
  },
  {
    id: 'crm',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'CRM' }),
    cell: ({ row }) => {
      if (row.original.crmContactId) {
        return h('div', { class: 'text-sm' }, [
          h('p', { class: 'font-medium' }, row.original.crmContactName || 'Vinculado'),
          row.original.crmCompanyName
            ? h('p', { class: 'text-xs text-muted-foreground' }, row.original.crmCompanyName)
            : null,
        ])
      }
      return h(Badge, { variant: 'outline' }, () => 'Não vinculado')
    },
    enableSorting: false,
  },
  {
    accessorKey: 'tags',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Tags' }),
    cell: ({ row }) => {
      const tags = row.getValue('tags') as string[]
      if (!tags?.length)
        return '—'
      return h('div', { class: 'flex flex-wrap gap-1' },
        tags.slice(0, 2).map(tag =>
          h('span', { class: 'rounded-md bg-muted px-2 py-0.5 text-xs' }, tag),
        ),
      )
    },
    enableSorting: false,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      if (row.original.blocked)
        return h(Badge, { variant: 'destructive' }, () => 'Bloqueado')
      if (!row.original.optIn)
        return h(Badge, { variant: 'secondary' }, () => 'Opt-out')
      return h(Badge, { variant: 'default' }, () => 'Ativo')
    },
    enableSorting: false,
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
