export interface NavBase {
  roles?: string[]
}

export interface NavLink extends NavBase {
  title: string
  link: string
  icon?: string
  new?: boolean
  children?: NavLink[]
}

export interface NavSectionTitle {
  heading: string
}

export interface NavGroup extends NavBase {
  title: string
  icon?: string
  new?: boolean
  children: NavLink[]
}

export interface NavMenu {
  heading: string
  items: NavMenuItems
}

export declare type NavMenuItems = (NavLink | NavGroup | NavSectionTitle)[]
