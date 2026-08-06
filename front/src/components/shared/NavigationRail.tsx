import { useMemo } from 'react'
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useNavigationRail } from '@/app/providers/NavigationRailProvider'
import { PanelHeader } from '@/components/shared/PanelHeader'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

const publicNavItems = [
  { to: '/home', label: 'Home', icon: Home, end: true as const },
  { to: '/', label: 'Discover Resources', icon: MapPin, end: true as const },
  { to: '/submit', label: 'Contribute Resource', icon: PlusCircle, end: false as const },
]

interface StaffNavItem {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
  /** When true, only users with `canManageUsers` see this item. */
  adminOnly?: boolean
}

const staffNavItems: StaffNavItem[] = [
  { to: '/staff', label: 'Dashboard', icon: LayoutDashboard, end: true },
  {
    to: '/staff/submissions',
    label: 'Review Submissions',
    icon: ClipboardList,
    end: false,
  },
  {
    to: '/staff/users',
    label: 'User Management',
    icon: Users,
    end: false,
    adminOnly: true,
  },
]

function NavigationRailLogo() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary"
      aria-hidden="true"
    >
      <span className="font-heading text-xs font-bold text-primary-foreground">RC</span>
    </div>
  )
}

function navLinkClassName(isActive: boolean, isCollapsed: boolean, nested = false) {
  return cn(
    'flex min-h-[var(--ds-min-touch)] items-center rounded-lg text-sm font-medium transition-colors focus-ring',
    isCollapsed ? 'justify-center px-2' : 'gap-3 py-2.5',
    !isCollapsed && (nested ? 'px-3 pl-8' : 'px-3'),
    isActive
      ? 'bg-interactive-muted font-semibold text-interactive'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )
}

export function NavigationRail() {
  const { isCollapsed, toggleCollapsed } = useNavigationRail()
  const { isAuthenticated, permissions } = useAuth()

  const visibleStaffNavItems = useMemo(
    () =>
      staffNavItems.filter(
        (item) => !item.adminOnly || permissions.canManageUsers,
      ),
    [permissions.canManageUsers],
  )

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200',
        isCollapsed ? 'w-16' : 'w-56',
      )}
      aria-label="Main navigation"
    >
      <PanelHeader
        compact={isCollapsed}
        centered={isCollapsed}
        leading={<NavigationRailLogo />}
        title={
          !isCollapsed ? (
            <p className="font-heading text-sm font-semibold text-foreground">RRCRC</p>
          ) : undefined
        }
        subtitle={
          !isCollapsed ? (
            <p className="text-xs text-muted-foreground">Resource Discovery</p>
          ) : undefined
        }
      />

      <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
        {publicNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) => navLinkClassName(isActive, isCollapsed)}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}

        {isAuthenticated ? (
          <div className={cn('pt-3', !isCollapsed && 'mt-1 border-t border-border')}>
            {!isCollapsed ? (
              <p className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Staff Workspace
              </p>
            ) : (
              <div
                className="mb-1 flex justify-center py-1"
                title="Staff Workspace"
                aria-hidden="true"
              >
                <span className="h-px w-6 bg-border" />
              </div>
            )}

            <div className="space-y-1" role="group" aria-label="Staff Workspace">
              {visibleStaffNavItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={isCollapsed ? label : undefined}
                  className={({ isActive }) => navLinkClassName(isActive, isCollapsed, true)}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-border p-2">
        <Button
          type="button"
          variant="ghost"
          size={isCollapsed ? 'icon' : 'sm'}
          onClick={toggleCollapsed}
          className={cn('w-full', !isCollapsed && 'justify-start gap-2')}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
