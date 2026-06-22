export default defineNuxtRouteMiddleware((to) => {
  const publicPages = [
    '/login',
    '/login-basic',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/403',
    '/404',
    '/401',
    '/500',
    '/503',
    '/confirm',
  ]

  if (publicPages.includes(to.path))
    return

  const session = useSupabaseSession()
  if (!session.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})
