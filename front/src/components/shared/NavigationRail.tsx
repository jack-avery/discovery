import {
  Home,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  RefreshCw,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useNavigationRail } from '@/app/providers/NavigationRailProvider'
import { PanelHeader } from '@/components/shared/PanelHeader'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/home', label: 'Home', icon: Home, end: true as const },
  { to: '/', label: 'Discover Resources', icon: MapPin, end: true as const },
  { to: '/submit', label: 'Submit Resource', icon: PlusCircle, end: false as const },
  { to: '/request-update', label: 'Request Update', icon: RefreshCw, end: false as const },
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

export function NavigationRail() {
  const { isCollapsed, toggleCollapsed } = useNavigationRail()

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
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex min-h-[var(--ds-min-touch)] items-center rounded-lg text-sm font-medium transition-colors focus-ring',
                isCollapsed ? 'justify-center px-2' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-interactive-muted font-semibold text-interactive'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
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
