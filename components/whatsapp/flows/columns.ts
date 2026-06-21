import type { ColumnDef } from '@tanstack/vue-table'
import type { WhatsAppFlow } from '~/types/whatsapp'

import { h } from 'vue'
import FlowStatusBadge from '~/components/whatsapp/flows/FlowStatusBadge.vue'
import DataTableColumnHeader from '@/components/tasks/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/components/ui/table/DataTableRowActions.vue'
import { WHATSAPP_FLOW_TRIGGER_LABELS } from '~/constants/whatsapp'

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const columns: ColumnDef<WhatsAppFlow>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Flow' }),
    cell: ({ row, table }) =>
      h(
        'button',
        {
          type: 'button',
          class: 'text-left font-medium hover:underline',
          onClick: () => (table.options.meta as any)?.onOpen?.(row.original),
        },
        row.original.name,
      ),
    enableSorting: true,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => h(FlowStatusBadge, { status: row.original.status }),
    enableSorting: false,
  },
  {
    id: 'trigger',
    header: 'Gatilho',
    cell: ({ row }) => WHATSAPP_FLOW_TRIGGER_LABELS[row.original.triggerType] || row.original.triggerType,
    enableSorting: false,
  },
  {
    id: 'executions',
    header: 'Execuções',
    cell: ({ row }) => row.original.executionsCount ?? 0,
    enableSorting: false,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Atualizado' }),
    cell: ({ row }) => formatDate(row.original.updatedAt),
    enableSorting: true,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) =>
      h(DataTableRowActions, {
        row,
        onEdit: () => (table.options.meta as any)?.onOpen?.(row.original),
        onDelete: () => (table.options.meta as any)?.onDelete?.(row.original),
      }),
    enableSorting: false,
    enableHiding: false,
  },
]
