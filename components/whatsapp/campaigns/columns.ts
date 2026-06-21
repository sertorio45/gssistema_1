import type { ColumnDef } from '@tanstack/vue-table'
import type { WhatsAppCampaign } from '~/types/whatsapp'

import { h } from 'vue'
import CampaignStatusBadge from '~/components/whatsapp/campaigns/CampaignStatusBadge.vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const columns: ColumnDef<WhatsAppCampaign>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Campanha' }),
    cell: ({ row, table }) =>
      h(
        'button',
        {
          type: 'button',
          class: 'text-left font-medium hover:underline',
          onClick: () => (table.options.meta as any)?.onView?.(row.original),
        },
        row.original.name,
      ),
    enableSorting: true,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => h(CampaignStatusBadge, { status: row.original.status }),
    enableSorting: false,
  },
  {
    id: 'instance',
    header: 'Instância',
    cell: ({ row }) => row.original.instanceName || '—',
    enableSorting: false,
  },
  {
    id: 'audience',
    header: 'Destinatários',
    cell: ({ row }) => {
      const stats = row.original.stats || {}
      const total = stats.total ?? 0
      const sent = stats.sent ?? 0
      if (!total)
        return '—'
      return `${sent}/${total}`
    },
    enableSorting: false,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Atualizada' }),
    cell: ({ row }) => formatDate(row.original.updatedAt),
    enableSorting: true,
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
