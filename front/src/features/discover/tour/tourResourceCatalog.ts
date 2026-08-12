/**
 * Live catalog of resource IDs currently loaded in Discover results.
 * Used only as a fallback when the tour needs to open a real resource
 * for the Update Resource step — never hardcoded.
 */
let tourResourceIds: string[] = []

export function setTourResourceCatalog(resourceIds: readonly string[]): void {
  tourResourceIds = [...resourceIds]
}

export function getTourResourceCatalog(): readonly string[] {
  return tourResourceIds
}

export function pickFirstTourResourceId(): string | null {
  return tourResourceIds[0] ?? null
}

/**
 * Resolve which resource the Update Resource tour step should demonstrate.
 * Prefers an existing selection; otherwise the first loaded catalog id.
 */
export function resolveTourDemoResourceId(args: {
  selectedResourceId: string | null | undefined
  preservedResourceId: string | null | undefined
  catalog?: readonly string[]
}): string | null {
  if (args.selectedResourceId) return args.selectedResourceId
  if (args.preservedResourceId) return args.preservedResourceId
  const catalog = args.catalog ?? tourResourceIds
  return catalog[0] ?? null
}
