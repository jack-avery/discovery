import type { ReactNode } from 'react'
import type { AccessMode } from '@/types/submission'
import { OptionCardGroup, type OptionCardOption } from './OptionCardGroup'

const ACCESS_MODE_OPTIONS: OptionCardOption<AccessMode>[] = [
  { value: 'physical', label: 'Physical location' },
  { value: 'online', label: 'Online' },
  { value: 'both', label: 'Both' },
]

interface AccessModeSelectorProps {
  name: string
  value: AccessMode | null
  onChange: (value: AccessMode) => void
  error?: string
  /** Defaults to the resource wording. */
  legend?: string
  className?: string
}

/**
 * Shared Location access-mode cards (single-select radios).
 * Used by resource and event submission editors.
 */
export function AccessModeSelector({
  name,
  value,
  onChange,
  error,
  legend = 'How can people access this resource?',
  className,
}: AccessModeSelectorProps) {
  return (
    <OptionCardGroup<AccessMode>
      name={name}
      legend={legend}
      hint="Choose all that apply."
      options={ACCESS_MODE_OPTIONS}
      value={value}
      onChange={onChange}
      error={error}
      showRadioIndicator
      className={className}
    />
  )
}

interface AccessModeBothCalloutProps {
  children?: ReactNode
}

/** Inline guidance when “Both” is selected. */
export function AccessModeBothCallout({
  children = (
    <>
      Because you selected &ldquo;Both&rdquo;, please provide both location
      details and an online link.
    </>
  ),
}: AccessModeBothCalloutProps) {
  return (
    <aside
      className="rounded-xl border border-interactive/25 bg-interactive-muted px-4 py-3 text-sm leading-relaxed text-foreground"
      aria-live="polite"
    >
      {children}
    </aside>
  )
}
