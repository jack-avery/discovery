import type { CostOption } from '@/types/submission'

/**
 * Canonical cost snapshot for semantic equality (form dirty detection,
 * moderation structured edits, Current→Proposed `changed`, etc.).
 *
 * Aligns with publish mapping in `mapResourceCostDescription`:
 * - free / not_sure ignore leftover costDetails
 * - other modes preserve trimmed details
 * - null option preserves trimmed details (existing mapper behaviour)
 */
export type CostSlice = {
  costOption: CostOption | null
  costDetails: string
}

export type CanonicalCost = {
  costOption: CostOption | null
  costDetails: string
}

export function canonicalizeCost(slice: CostSlice): CanonicalCost {
  const details = slice.costDetails.trim()
  const option = slice.costOption

  if (option === 'free' || option === 'not_sure') {
    return { costOption: option, costDetails: '' }
  }

  return { costOption: option, costDetails: details }
}

/** True when two cost slices are semantically equivalent. */
export function areCostsEquivalent(a: CostSlice, b: CostSlice): boolean {
  return (
    JSON.stringify(canonicalizeCost(a)) === JSON.stringify(canonicalizeCost(b))
  )
}
