import { toast } from 'vue-sonner'

export interface ConfirmDeleteOptions {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Shown after successful deletion. Defaults to "Excluído com sucesso." */
  successMessage?: string
  /** Shown on failure. Defaults to "Não foi possível excluir." */
  errorMessage?: string
}

interface ConfirmDeleteState {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
}

type ConfirmResolver = (confirmed: boolean) => void

const DEFAULT_STATE: ConfirmDeleteState = {
  open: false,
  title: 'Confirmar exclusão',
  description: 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
  confirmLabel: 'Excluir',
  cancelLabel: 'Cancelar',
}

let resolveConfirm: ConfirmResolver | null = null

function getState() {
  return useState<ConfirmDeleteState>('confirm-delete-dialog', () => ({ ...DEFAULT_STATE }))
}

function settle(confirmed: boolean) {
  const state = getState()
  const resolver = resolveConfirm
  resolveConfirm = null
  state.value = { ...DEFAULT_STATE }
  resolver?.(confirmed)
}

/**
 * Opens the global delete confirmation dialog.
 * Resolves `true` when the user confirms, `false` when cancelled.
 */
export function confirmDelete(options: ConfirmDeleteOptions = {}): Promise<boolean> {
  if (!import.meta.client)
    return Promise.resolve(false)

  if (resolveConfirm) {
    const previous = resolveConfirm
    resolveConfirm = null
    previous(false)
  }

  const state = getState()
  state.value = {
    open: true,
    title: options.title || DEFAULT_STATE.title,
    description: options.description || DEFAULT_STATE.description,
    confirmLabel: options.confirmLabel || DEFAULT_STATE.confirmLabel,
    cancelLabel: options.cancelLabel || DEFAULT_STATE.cancelLabel,
  }

  return new Promise<boolean>((resolve) => {
    resolveConfirm = resolve
  })
}

/**
 * Confirm → run action → toast success/error.
 * Returns `true` when the item was deleted successfully.
 */
export async function deleteWithConfirm(
  action: () => Promise<unknown>,
  options: ConfirmDeleteOptions = {},
): Promise<boolean> {
  const confirmed = await confirmDelete(options)
  if (!confirmed)
    return false

  try {
    await action()
    toast.success(options.successMessage || 'Excluído com sucesso.')
    return true
  }
  catch (error: any) {
    const message
      = error?.data?.statusMessage
      || error?.data?.message
      || error?.message
      || options.errorMessage
      || 'Não foi possível excluir.'
    toast.error(message)
    return false
  }
}

/** Used exclusively by ConfirmDeleteHost */
export function useConfirmDeleteHost() {
  const state = getState()

  return {
    state,
    acceptConfirm: () => settle(true),
    cancelConfirm: () => settle(false),
  }
}

export function useConfirmDelete() {
  return {
    confirmDelete,
    deleteWithConfirm,
  }
}
