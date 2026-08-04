/**
 * Tracks navigations for the hub “Continuar de onde parou” list.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const memory = useHubNavigationMemory()

  memory.hydrateFromStorage()

  router.afterEach((to) => {
    if (!import.meta.client)
      return
    // Ignore redirects that bounce immediately to the same hub root.
    if (to.path === '/' || to.name === 'index')
      return
    memory.trackPath(to.fullPath)
  })
})
