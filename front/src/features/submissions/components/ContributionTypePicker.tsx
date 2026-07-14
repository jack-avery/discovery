import { Button } from '@/components/ui'
import type { ContributionType } from '@/types/submission'
import { CONTRIBUTION_TYPE_ORDER } from '../constants/contributionTypes'
import { ContributionTypeCard } from './ContributionTypeCard'

interface ContributionTypePickerProps {
  /** When false, the picker is hidden (used after contributions exist). */
  visible: boolean
  /** Show cancel when dismissing “Add another” with existing contributions. */
  showCancel?: boolean
  onCancel?: () => void
  onSelect: (type: ContributionType) => void
}

export function ContributionTypePicker({
  visible,
  showCancel = false,
  onCancel,
  onSelect,
}: ContributionTypePickerProps) {
  if (!visible) return null

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col items-center"
      role="group"
      aria-labelledby="contribution-type-picker-heading"
    >
      <div className="relative w-full max-w-2xl text-center">
        {showCancel && onCancel ? (
          <div className="mb-3 flex justify-center sm:absolute sm:right-0 sm:top-0 sm:mb-0 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        ) : null}

        <h2
          id="contribution-type-picker-heading"
          className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          What would you like to contribute?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choose the option that best fits what you&apos;d like to share.
        </p>
      </div>

      <div className="mt-8 grid w-full gap-5 sm:mt-10 md:grid-cols-3 md:gap-6">
        {CONTRIBUTION_TYPE_ORDER.map((type) => (
          <ContributionTypeCard
            key={type}
            type={type}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
