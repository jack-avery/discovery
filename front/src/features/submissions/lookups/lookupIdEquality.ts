/**
 * Canonical lookup-ID bags for semantic equality (form dirty detection,
 * moderation structured edits, Current→Proposed `changed`, etc.).
 *
 * Order is non-semantic. Duplicates are preserved (no dedupe) to match existing
 * form snapshot behaviour. Names/labels are never part of equality.
 */

export function canonicalizeLookupIds(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b)
}

/** True when two ID lists are semantically equivalent (order-insensitive). */
export function areLookupIdSetsEquivalent(a: number[], b: number[]): boolean {
  return (
    JSON.stringify(canonicalizeLookupIds(a)) ===
    JSON.stringify(canonicalizeLookupIds(b))
  )
}
