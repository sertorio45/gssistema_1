import { useSupabaseClient, useSupabaseUser } from '#imports'

import { getAvatarColor, getInitials } from '~/utils/avatar'

const AVATARS_BUCKET = 'user-avatars'
const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB (matches bucket limit)
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface UpdateProfilePayload {
  name: string
  phone?: string
}

/**
 * Central profile state: reads identity from Supabase Auth (user_metadata)
 * and manages avatar upload/removal in the dedicated `user-avatars` bucket.
 * Files are stored as {user_id}/avatar-{timestamp}.{ext} so each user's
 * images stay isolated in their own folder.
 */
export function useUserProfile() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const saving = ref(false)
  const uploading = ref(false)

  const email = computed(() => user.value?.email ?? '')

  const displayName = computed(() => {
    const metadata = user.value?.user_metadata as Record<string, any> | undefined
    return (metadata?.name as string | undefined)?.trim()
      || (metadata?.full_name as string | undefined)?.trim()
      || email.value.split('@')[0]
      || 'Usuário'
  })

  const phone = computed(() => {
    const metadata = user.value?.user_metadata as Record<string, any> | undefined
    return (metadata?.phone as string | undefined) ?? ''
  })

  const avatarUrl = computed(() => {
    const metadata = user.value?.user_metadata as Record<string, any> | undefined
    return (metadata?.avatar_url as string | undefined) ?? ''
  })

  const initials = computed(() => getInitials(displayName.value || email.value))
  const avatarColor = computed(() => getAvatarColor(displayName.value || email.value))

  function validateAvatarFile(file: File): string | null {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type))
      return 'Formato inválido. Use JPG, PNG, WEBP ou GIF.'
    if (file.size > MAX_AVATAR_SIZE)
      return 'A imagem deve ter no máximo 5MB.'
    return null
  }

  /** Removes every object in the user's folder except the one to keep. */
  async function cleanupOldAvatars(userId: string, keepPath?: string) {
    const { data: files } = await client.storage.from(AVATARS_BUCKET).list(userId)
    if (!files?.length)
      return

    const stale = files
      .map(file => `${userId}/${file.name}`)
      .filter(path => path !== keepPath)

    if (stale.length)
      await client.storage.from(AVATARS_BUCKET).remove(stale)
  }

  async function uploadAvatar(file: File): Promise<{ success: boolean, error?: string }> {
    if (!user.value)
      return { success: false, error: 'Usuário não autenticado.' }

    const validationError = validateAvatarFile(file)
    if (validationError)
      return { success: false, error: validationError }

    uploading.value = true
    try {
      const userId = user.value.id
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const objectPath = `${userId}/avatar-${Date.now()}.${ext}`

      const { error: uploadError } = await client.storage
        .from(AVATARS_BUCKET)
        .upload(objectPath, file, { cacheControl: '3600', upsert: false })

      if (uploadError)
        return { success: false, error: uploadError.message }

      const { data: publicData } = client.storage.from(AVATARS_BUCKET).getPublicUrl(objectPath)

      const { error: updateError } = await client.auth.updateUser({
        data: { avatar_url: publicData.publicUrl },
      })

      if (updateError) {
        await client.storage.from(AVATARS_BUCKET).remove([objectPath])
        return { success: false, error: updateError.message }
      }

      await cleanupOldAvatars(userId, objectPath)
      return { success: true }
    }
    catch (err: any) {
      return { success: false, error: err?.message ?? 'Erro ao enviar imagem.' }
    }
    finally {
      uploading.value = false
    }
  }

  async function removeAvatar(): Promise<{ success: boolean, error?: string }> {
    if (!user.value)
      return { success: false, error: 'Usuário não autenticado.' }

    uploading.value = true
    try {
      const { error: updateError } = await client.auth.updateUser({
        data: { avatar_url: null },
      })

      if (updateError)
        return { success: false, error: updateError.message }

      await cleanupOldAvatars(user.value.id)
      return { success: true }
    }
    catch (err: any) {
      return { success: false, error: err?.message ?? 'Erro ao remover imagem.' }
    }
    finally {
      uploading.value = false
    }
  }

  async function updateProfile(payload: UpdateProfilePayload): Promise<{ success: boolean, error?: string }> {
    if (!user.value)
      return { success: false, error: 'Usuário não autenticado.' }

    saving.value = true
    try {
      const { error: updateError } = await client.auth.updateUser({
        data: {
          name: payload.name.trim(),
          phone: payload.phone?.trim() || null,
        },
      })

      if (updateError)
        return { success: false, error: updateError.message }

      return { success: true }
    }
    catch (err: any) {
      return { success: false, error: err?.message ?? 'Erro ao salvar perfil.' }
    }
    finally {
      saving.value = false
    }
  }

  return {
    user,
    email,
    displayName,
    phone,
    avatarUrl,
    initials,
    avatarColor,
    saving,
    uploading,
    uploadAvatar,
    removeAvatar,
    updateProfile,
  }
}
