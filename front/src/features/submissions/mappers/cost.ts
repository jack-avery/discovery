import type { CostOption, EventCostOption } from '@/types/submission'
import { COST_LABELS, EVENT_COST_LABELS } from './labels'
import { trimText } from './notes'

export function mapResourceCostDescription(
  costOption: CostOption | null,
  costDetails: string,
): string | undefined {
  if (!costOption) {
    const details = trimText(costDetails)
    return details || undefined
  }

  if (costOption === 'other') {
    return trimText(costDetails) || COST_LABELS.other
  }

  const label = COST_LABELS[costOption]
  const details = trimText(costDetails)
  if (details && costOption !== 'free' && costOption !== 'not_sure') {
    return `${label}: ${details}`
  }
  return label
}

export function mapEventCostDescription(
  costOption: EventCostOption | null,
  costDetails: string,
): string | undefined {
  if (!costOption) {
    const details = trimText(costDetails)
    return details || undefined
  }

  if (costOption === 'other') {
    return trimText(costDetails) || EVENT_COST_LABELS.other
  }

  const label = EVENT_COST_LABELS[costOption]
  const details = trimText(costDetails)
  if (
    details &&
    costOption !== 'free' &&
    costOption !== 'free_registration' &&
    costOption !== 'not_sure'
  ) {
    return `${label}: ${details}`
  }
  return label
}
