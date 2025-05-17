import defu from 'defu'

export default defineAppConfig({
  icon: {
    size: '', // default <Icon> size applied
    class: '', // default <Icon> class applied
  },
  sidebar: {
    collapsible: 'offcanvas', // 'offcanvas' | 'icon' | 'none'
    side: 'left', // 'left' | 'right'
    variant: 'sidebar', // 'sidebar' | 'floating' | 'inset'
  },
  ui: {
    primary: 'blue',
    gray: 'slate',
    notifications: {
      position: 'top-right',
    },
  },
  theme: {
    dark: true,
    colors: {
      primary: 'blue',
    },
  },
})
