import { useToast } from '~/components/ui/toast'

export function useArticleDelete() {
  const { toast } = useToast()
  const isDeleting = ref(false)

  async function deleteArticle(article: { id: string; title: string }) {
    isDeleting.value = true

    try {
      const { error } = await useFetch('/api/articles', {
        method: 'DELETE',
        body: {
          id: article.id,
          title: article.title,
        },
      })

      if (error.value) {
        throw new Error(error.value.message)
      }

      toast({
        title: 'Sucesso',
        description: 'Artigo excluído com sucesso!',
      })

      return true
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir artigo',
        variant: 'destructive',
      })
      return false
    } finally {
      isDeleting.value = false
    }
  }

  return {
    deleteArticle,
    isDeleting,
  }
} 