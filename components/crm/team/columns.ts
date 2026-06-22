import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'

import DataTableColumnHeader from '~/components/users/DataTableColumnHeader.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { TENANT_TEAM_ROLE_LABELS, type TenantTeamMember } from '~/types/tenant-team'

export function createTeamColumns(handlers: {
  onEdit: (member: TenantTeamMember) => void
  onDelete: (member: TenantTeamMember) => void
}): ColumnDef<TenantTeamMember>[] {
  return [
  {
    accessorKey: 'name',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Nome' }),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
  },
  {
    accessorKey: 'email',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'E-mail' }),
    cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, row.original.email),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Função' }),
    cell: ({ row }) => h(Badge, { variant: 'outline' }, () => TENANT_TEAM_ROLE_LABELS[row.original.role] || row.original.role),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Criado em' }),
    cell: ({ row }) => h(
      'span',
      { class: 'text-muted-foreground text-sm' },
      new Date(row.original.createdAt).toLocaleDateString('pt-BR'),
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => h('div', { class: 'flex justify-end gap-1' }, [
      h(Button, {
        variant: 'ghost',
        size: 'sm',
        onClick: () => handlers.onEdit(row.original),
      }, () => 'Editar'),
      h(Button, {
        variant: 'ghost',
        size: 'sm',
        class: 'text-destructive hover:text-destructive',
        onClick: () => handlers.onDelete(row.original),
      }, () => 'Remover'),
    ]),
  },
  ]
}
