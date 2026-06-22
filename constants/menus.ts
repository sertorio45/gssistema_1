import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: '',
    items: [
      {
        title: 'CRM',
        icon: 'i-lucide-briefcase',
        roles: ['admin', 'funcionario', 'cliente', 'atendente'],
        children: [
          { title: 'Painel', icon: 'i-lucide-layout-dashboard', link: '/crm/dashboard' },
          { title: 'Funil de Vendas', icon: 'i-lucide-trending-up', link: '/crm/funnel' },
          { title: 'Empresas', icon: 'i-lucide-building', link: '/crm/company' },
          { title: 'Contatos', icon: 'i-lucide-contact', link: '/crm/contacts' },
          { title: 'Reuniões', icon: 'i-lucide-calendar', link: '/crm/meetings' },
          { title: 'Produtos & Serviços', icon: 'i-lucide-package', link: '/crm/products' },
          { title: 'Marketing', icon: 'i-lucide-megaphone', link: '/crm/marketing' },
          {
            title: 'Configurações',
            icon: 'i-lucide-bar-chart-3',
            link: '/crm/config',
          },
          {
            title: 'Usuários',
            icon: 'i-lucide-users',
            link: '/settings/team',
            roles: ['admin', 'funcionario', 'cliente'],
          },
        ],
      },
    ],
  },
  {
    heading: '',
    items: [
      {
        title: 'WhatsApp',
        icon: 'i-lucide-message-circle',
        roles: ['admin', 'funcionario', 'cliente', 'atendente'],
        children: [
          { title: 'Painel', icon: 'i-lucide-layout-dashboard', link: '/whatsapp/dashboard' },
          { title: 'Conversas', icon: 'i-lucide-messages-square', link: '/whatsapp/conversations' },
          { title: 'Contatos', icon: 'i-lucide-contact', link: '/whatsapp/contacts' },
          { title: 'Campanhas', icon: 'i-lucide-megaphone', link: '/whatsapp/campaigns' },
          { title: 'Agentes IA', icon: 'i-lucide-bot', link: '/whatsapp/agents', new: true },
          { title: 'Flows', icon: 'i-lucide-workflow', link: '/whatsapp/flows', new: true },
          { title: 'Templates', icon: 'i-lucide-file-text', link: '/whatsapp/templates' },
          { title: 'Integrações', icon: 'i-lucide-plug', link: '/whatsapp/integrations' },
          { title: 'Relatórios', icon: 'i-lucide-bar-chart-3', link: '/whatsapp/reports' },
          { title: 'Configurações', icon: 'i-lucide-settings', link: '/whatsapp/settings' },
        ],
      },
    ],
  },
  {
    heading: '',
    items: [
      {
        title: 'Articles',
        icon: 'i-lucide-book-a',
        roles: ['admin', 'funcionario', 'cliente', 'atendente'],
        children: [
          { title: 'View articles', icon: 'i-lucide-file-text', link: '/articles' },
          { title: 'Create', icon: 'i-lucide-plus-circle', link: '/articles/new' },
          { title: 'Categories', icon: 'i-lucide-folder', link: '/articles/category' },
          { title: 'Tags', icon: 'i-lucide-tags', link: '/articles/tag' },
        ],
      },
    ],
  },
  {
    heading: 'General',
    items: [
      {
        title: 'Home',
        icon: 'i-lucide-home',
        link: '/',
      },
      {
        title: 'Email',
        icon: 'i-lucide-mail',
        link: '/email',
      },
      {
        title: 'Tasks',
        icon: 'i-lucide-calendar-check-2',
        link: '/tasks',
        new: true,
      },
    ],
  },
  {
    heading: 'Pages',
    items: [
      {
        title: 'Authentication',
        icon: 'i-lucide-lock-keyhole-open',
        children: [
          {
            title: 'Login',
            icon: 'i-lucide-circle',
            link: '/login',
          },
          {
            title: 'Login Basic',
            icon: 'i-lucide-circle',
            link: '/login-basic',
          },
          {
            title: 'Register',
            icon: 'i-lucide-circle',
            link: '/register',
          },
          {
            title: 'Forgot Password',
            icon: 'i-lucide-circle',
            link: '/forgot-password',
          },
        ],
      },
      {
        title: 'Errors',
        icon: 'i-lucide-triangle-alert',
        children: [
          {
            title: '401 - Unauthorized',
            icon: 'i-lucide-circle',
            link: '/401',
          },
          {
            title: '403 - Forbidden',
            icon: 'i-lucide-circle',
            link: '/403',
          },
          {
            title: '404 - Not Found',
            icon: 'i-lucide-circle',
            link: '/404',
          },
          {
            title: '500 - Internal Server Error',
            icon: 'i-lucide-circle',
            link: '/500',
          },
          {
            title: '503 - Service Unavailable',
            icon: 'i-lucide-circle',
            link: '/503',
          },
        ],
      },
      {
        title: 'Settings',
        icon: 'i-lucide-settings',
        new: true,
        children: [
          {
            title: 'Profile',
            icon: 'i-lucide-circle',
            link: '/settings/profile',
          },
          {
            title: 'Account',
            icon: 'i-lucide-circle',
            link: '/settings/account',
          },
          {
            title: 'Appearance',
            icon: 'i-lucide-circle',
            link: '/settings/appearance',
          },
          {
            title: 'Notifications',
            icon: 'i-lucide-circle',
            link: '/settings/notifications',
          },
          {
            title: 'Display',
            icon: 'i-lucide-circle',
            link: '/settings/display',
          },
        ],
      },
    ],
  },
  {
    heading: 'Components',
    items: [
      {
        title: 'Components',
        icon: 'i-lucide-component',
        children: [
          {
            title: 'Accordion',
            icon: 'i-lucide-circle',
            link: '/components/accordion',
          },
          {
            title: 'Alert',
            icon: 'i-lucide-circle',
            link: '/components/alert',
          },
          {
            title: 'Alert Dialog',
            icon: 'i-lucide-circle',
            link: '/components/alert-dialog',
          },
          {
            title: 'Aspect Ratio',
            icon: 'i-lucide-circle',
            link: '/components/aspect-ratio',
          },
          {
            title: 'Avatar',
            icon: 'i-lucide-circle',
            link: '/components/avatar',
          },
          {
            title: 'Badge',
            icon: 'i-lucide-circle',
            link: '/components/badge',
          },
          {
            title: 'Breadcrumb',
            icon: 'i-lucide-circle',
            link: '/components/breadcrumb',
          },
          {
            title: 'Button',
            icon: 'i-lucide-circle',
            link: '/components/button',
          },
          {
            title: 'Calendar',
            icon: 'i-lucide-circle',
            link: '/components/calendar',
          },
          {
            title: 'Card',
            icon: 'i-lucide-circle',
            link: '/components/card',
          },
          {
            title: 'Carousel',
            icon: 'i-lucide-circle',
            link: '/components/carousel',
          },
          {
            title: 'Checkbox',
            icon: 'i-lucide-circle',
            link: '/components/checkbox',
          },
          {
            title: 'Collapsible',
            icon: 'i-lucide-circle',
            link: '/components/collapsible',
          },
          {
            title: 'Combobox',
            icon: 'i-lucide-circle',
            link: '/components/combobox',
          },
          {
            title: 'Command',
            icon: 'i-lucide-circle',
            link: '/components/command',
          },
          {
            title: 'Context Menu',
            icon: 'i-lucide-circle',
            link: '/components/context-menu',
          },
          {
            title: 'Dialog',
            icon: 'i-lucide-circle',
            link: '/components/dialog',
          },
          {
            title: 'Drawer',
            icon: 'i-lucide-circle',
            link: '/components/drawer',
          },
          {
            title: 'Dropdown Menu',
            icon: 'i-lucide-circle',
            link: '/components/dropdown-menu',
          },
          {
            title: 'Form',
            icon: 'i-lucide-circle',
            link: '/components/form',
          },
          {
            title: 'Hover Card',
            icon: 'i-lucide-circle',
            link: '/components/hover-card',
          },
          {
            title: 'Input',
            icon: 'i-lucide-circle',
            link: '/components/input',
          },
          {
            title: 'Label',
            icon: 'i-lucide-circle',
            link: '/components/label',
          },
          {
            title: 'Menubar',
            icon: 'i-lucide-circle',
            link: '/components/menubar',
          },
          {
            title: 'Navigation Menu',
            icon: 'i-lucide-circle',
            link: '/components/navigation-menu',
          },
          {
            title: 'Number Field',
            icon: 'i-lucide-circle',
            link: '/components/number-field',
          },
          {
            title: 'Pagination',
            icon: 'i-lucide-circle',
            link: '/components/pagination',
          },
          {
            title: 'PIN Input',
            icon: 'i-lucide-circle',
            link: '/components/pin-input',
          },
          {
            title: 'Popover',
            icon: 'i-lucide-circle',
            link: '/components/popover',
          },
          {
            title: 'Progress',
            icon: 'i-lucide-circle',
            link: '/components/progress',
          },
          {
            title: 'Radio Group',
            icon: 'i-lucide-circle',
            link: '/components/radio-group',
          },
          {
            title: 'Range Calendar',
            icon: 'i-lucide-circle',
            link: '/components/range-calendar',
          },
          {
            title: 'Resizable',
            icon: 'i-lucide-circle',
            link: '/components/resizable',
          },
          {
            title: 'Scroll Area',
            icon: 'i-lucide-circle',
            link: '/components/scroll-area',
          },
          {
            title: 'Select',
            icon: 'i-lucide-circle',
            link: '/components/select',
          },
          {
            title: 'Separator',
            icon: 'i-lucide-circle',
            link: '/components/separator',
          },
          {
            title: 'Sheet',
            icon: 'i-lucide-circle',
            link: '/components/sheet',
          },
          {
            title: 'Skeleton',
            icon: 'i-lucide-circle',
            link: '/components/skeleton',
          },
          {
            title: 'Slider',
            icon: 'i-lucide-circle',
            link: '/components/slider',
          },
          {
            title: 'Sonner',
            icon: 'i-lucide-circle',
            link: '/components/sonner',
          },
          {
            title: 'Stepper',
            icon: 'i-lucide-circle',
            link: '/components/stepper',
            new: true,
          },
          {
            title: 'Switch',
            icon: 'i-lucide-circle',
            link: '/components/switch',
          },
          {
            title: 'Table',
            icon: 'i-lucide-circle',
            link: '/components/table',
          },
          {
            title: 'Tabs',
            icon: 'i-lucide-circle',
            link: '/components/tabs',
          },
          {
            title: 'Tags Input',
            icon: 'i-lucide-circle',
            link: '/components/tags-input',
          },
          {
            title: 'Textarea',
            icon: 'i-lucide-circle',
            link: '/components/textarea',
          },
          {
            title: 'Toast',
            icon: 'i-lucide-circle',
            link: '/components/toast',
          },
          {
            title: 'Toggle',
            icon: 'i-lucide-circle',
            link: '/components/toggle',
          },
          {
            title: 'Toggle Group',
            icon: 'i-lucide-circle',
            link: '/components/toggle-group',
          },
          {
            title: 'Tooltip',
            icon: 'i-lucide-circle',
            link: '/components/tooltip',
          },
        ],
      },
    ],
  },
]

/** Administration: only for admin role, shown in a separate section at the bottom of the sidebar */
export const navMenuAdmin: NavMenu[] = [
  {
    heading: 'Administração',
    items: [
      {
        title: 'Administração',
        icon: 'i-lucide-lock-keyhole-open',
        roles: ['admin', 'funcionario'],
        children: [
          { title: 'Usuários', icon: 'i-lucide-users', link: '/admin/users' },
          { title: 'Empresas', icon: 'i-lucide-building-2', link: '/admin/tenants' },
        ],
      },
    ],
  },
]

/** Tenant user management: for client owners and staff managing a tenant */
export const navMenuTenant: NavMenu[] = [
  {
    heading: 'Minha empresa',
    items: [
      {
        title: 'Usuários',
        icon: 'i-lucide-users',
        link: '/settings/team',
        roles: ['admin', 'funcionario', 'cliente'],
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = [
  {
    title: 'Help & Support',
    icon: 'i-lucide-circle-help',
    link: 'https://github.com/dianprata/nuxt-shadcn-dashboard',
  },
  {
    title: 'Feedback',
    icon: 'i-lucide-send',
    link: 'https://github.com/dianprata/nuxt-shadcn-dashboard',
  },
]
