import { cn } from '@/utils/cn'

/** Shared native select chrome for User Management (Role filter, form Role, etc.). */
export const usersSelectClassName = cn(
  // Extra right padding gives the native chevron breathing room from the border.
  'h-10 w-full rounded-lg border border-border bg-surface pl-3 pr-8 text-sm text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 focus-visible:border-interactive',
  'disabled:cursor-not-allowed disabled:opacity-50',
)
