/**
 * Update-request section picker options.
 * Selection only controls which editor sections start expanded.
 */

export const UPDATE_SECTION_IDS = [
  'about',
  'categories',
  'contact',
  'address',
  'hours',
  'accessibility',
  'cost',
  'website',
  'other',
] as const

export type UpdateSectionId = (typeof UPDATE_SECTION_IDS)[number]

export interface UpdateSectionOption {
  id: UpdateSectionId
  label: string
}

export const UPDATE_SECTION_OPTIONS: readonly UpdateSectionOption[] = [
  { id: 'about', label: 'About' },
  { id: 'categories', label: 'Categories' },
  { id: 'contact', label: 'Contact Information' },
  { id: 'address', label: 'Location' },
  { id: 'hours', label: 'Hours' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'cost', label: 'Cost' },
  { id: 'website', label: 'Website' },
  { id: 'other', label: 'Other' },
]
