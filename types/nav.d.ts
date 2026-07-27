export interface NavBase {
  roles?: string[]
  capability?: string
  /** Restricts the item to specific commercial models (agency, direct, platform). */
  organizationTypes?: Array<'platform' | 'agency' | 'direct'>
  /**
   * Who should see the item in the sidebar.
   * - agency: staff / agency ops only
   * - client: end-customer portal only
   * - both / omitted: everyone who passes other gates
   */
  audience?: 'agency' | 'client' | 'both'
  /** Label when the current workspace is the client portal experience. */
  clientTitle?: string
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
