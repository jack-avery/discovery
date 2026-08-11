import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Card } from '@/components/ui/Card'
import { APP_BRANDING } from '@/config/appBranding'
import { displayName } from '@/types/auth'

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  staff_editor: 'Staff Editor',
  moderator: 'Moderator',
}

const ROLE_SUBTITLES: Record<string, string> = {
  administrator: 'Full Access',
  staff_editor: 'Edit Resources',
  moderator: 'Review Submissions',
}

/** Highest staff role wins: administrator → staff_editor → moderator. */
const ROLE_PRIORITY = ['administrator', 'staff_editor', 'moderator'] as const

function highestStaffRole(roles: readonly string[]): (typeof ROLE_PRIORITY)[number] | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null
}

function primaryRoleLabel(roles: readonly string[]): string {
  const match = highestStaffRole(roles)
  if (!match) return 'Staff Member'
  return ROLE_LABELS[match]
}

function roleSubtitle(roles: readonly string[]): string {
  const match = highestStaffRole(roles)
  if (!match) return 'Staff Portal Access'
  return ROLE_SUBTITLES[match]
}

export function DashboardHeader() {
  const { user } = useAuth()
  const name = user ? displayName(user).split(' ')[0] : 'Staff Member'
  const roleLabel = user ? primaryRoleLabel(user.roles) : 'Moderator'
  const accessText = user ? roleSubtitle(user.roles) : 'Review Submissions'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">
          Welcome back, {name}! <span aria-hidden="true">👋</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening in {APP_BRANDING.communityName}{' '}
          today.
        </p>
      </div>

      <Card className="shrink-0 px-4 py-3 shadow-none">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-interactive-muted text-interactive"
            aria-hidden="true"
          >
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold text-foreground">
              {roleLabel}
            </p>
            <p className="text-xs text-muted-foreground">{accessText}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
