import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useMobileNavMenu } from '@/app/providers/MobileNavMenuProvider'
import { MobileNavDrawer } from '@/components/shared/MobileNavDrawer'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'
import { mobilePageTitle } from '@/components/shared/publicNavItems'
import { Button } from '@/components/ui'
import { APP_BRANDING } from '@/config/appBranding'

/**
 * Compact public chrome for viewports below `md`.
 * Replaces the persistent NavigationRail — desktop rail is unchanged.
 */
export function MobilePublicHeader() {
  const { pathname } = useLocation()
  const { isOpen, openMenu, closeMenu } = useMobileNavMenu()
  const title = mobilePageTitle(pathname)
  const hideSession = pathname === '/sign-in'

  return (
    <>
      <header
        className="app-header flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 pt-[env(safe-area-inset-top)] md:hidden"
        style={{
          height: 'calc(var(--ds-header-height) + env(safe-area-inset-top, 0px))',
          minHeight:
            'calc(var(--ds-header-height) + env(safe-area-inset-top, 0px))',
        }}
      >
        <Link
          to="/home"
          className="flex shrink-0 items-center rounded-lg focus-ring"
          aria-label={`${APP_BRANDING.communityName} ${APP_BRANDING.applicationName} home`}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"
            aria-hidden="true"
          >
            <span className="font-heading text-xs font-bold text-primary-foreground">
              {APP_BRANDING.communityMark}
            </span>
          </div>
        </Link>

        {title ? (
          <h1 className="min-w-0 flex-1 truncate font-heading text-sm font-semibold text-foreground">
            {title}
          </h1>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          {!hideSession ? (
            <StaffSessionControls compact className="max-w-[9rem]" />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            onClick={openMenu}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <MobileNavDrawer open={isOpen} onClose={closeMenu} />
    </>
  )
}
