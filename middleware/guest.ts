export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()

  // Se o usuário estiver autenticado e tentar acessar páginas de convidado
  // como login ou registro, redirecione para a página inicial
  if (user.value) {
    return navigateTo('/')
  }
})
