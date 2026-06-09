import { LogIn, MapPin, Menu, PlusCircle, RefreshCw, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

const publicNavItems = [
  { to: '/', label: 'Discover', icon: MapPin, end: true },
  { to: '/submit', label: 'Submit Resource', icon: PlusCircle },
  { to: '/request-update', label: 'Request Resource Update', icon: RefreshCw },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-overlay backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="app-header flex items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"
              aria-hidden="true"
            >
              <span className="font-heading text-xs font-bold text-primary-foreground">RC</span>
            </div>
            <div>
              <p className="font-heading text-sm font-semibold leading-tight text-foreground">
                RRCRC
              </p>
              <p className="text-xs leading-tight text-muted-foreground">Resource Discovery</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {publicNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[var(--ds-min-touch)] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-ring',
                  isActive
                    ? 'bg-interactive-muted text-interactive'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link
            to="/sign-in"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-ring"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            Staff Sign In
          </Link>
        </div>
      </aside>
    </>
  )
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label="Open navigation"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
