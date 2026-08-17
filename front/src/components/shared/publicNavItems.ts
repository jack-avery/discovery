import { Home, MapPin, PlusCircle, type LucideIcon } from 'lucide-react'

export interface PublicNavItem {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
}

/** Public application navigation — shared by desktop rail and mobile menu. */
export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover Resources', icon: MapPin, end: true },
  { to: '/submit', label: 'Contribute Resource', icon: PlusCircle, end: false },
] as const

/** Page title for the mobile public header, when appropriate. */
export function mobilePageTitle(pathname: string): string | null {
  if (pathname === '/' || pathname === '') return 'Home'
  if (pathname === '/discover') return 'Discover Resources'
  if (pathname.startsWith('/submit')) return 'Contribute Resource'
  if (pathname === '/sign-in') return 'Sign In'
  if (pathname === '/setup-password') return 'Set Up Password'
  if (pathname.startsWith('/staff')) return 'Staff Portal'
  if (pathname === '/404') return 'Not Found'
  return null
}
