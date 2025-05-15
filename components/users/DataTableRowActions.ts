import type { Row } from '@tanstack/vue-table'
import type { User } from './columns'
import { h, computed } from 'vue'
import { Button } from '../ui/button'
import { resolveComponent, useEmitter } from '#imports'

export const DataTableRowActions = {
  props: {
    row: {
      type: Object as () => Row<User>,
      required: true,
    },
  },
  setup(props) {
    const emit = useEmitter()
    const user = computed(() => props.row.original)

    function handleEdit() {
      emit('edit', user.value)
    }

    function handleDelete() {
      emit('delete', user.value)
    }

    return () => h('div', { class: 'flex justify-end gap-2' }, [
      h(Button, {
        variant: 'ghost',
        size: 'icon',
        class: 'h-8 w-8 text-muted-foreground hover:text-primary',
        onClick: handleEdit,
      }, [
        h(resolveComponent('Icon'), {
          name: 'lucide:pencil',
          class: 'h-4 w-4',
        }),
        h('span', { class: 'sr-only' }, 'Editar'),
      ]),
      h(Button, {
        variant: 'ghost',
        size: 'icon',
        class: 'h-8 w-8 text-muted-foreground hover:text-destructive',
        onClick: handleDelete,
      }, [
        h(resolveComponent('Icon'), {
          name: 'lucide:trash-2',
          class: 'h-4 w-4',
        }),
        h('span', { class: 'sr-only' }, 'Excluir'),
      ]),
    ])
  },
} 