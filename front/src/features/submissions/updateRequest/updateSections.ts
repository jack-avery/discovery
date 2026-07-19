/**
 * Update-request section picker options.
 * Selection only controls which editor sections start expanded.
 */

export const UPDATE_SECTION_IDS = [
  'about',
  'hours',
  'contact',
  'address',
  'categories',
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
  { id: 'hours', label: 'Hours' },
  { id: 'contact', label: 'Contact Information' },
  { id: 'address', label: 'Location' },
  { id: 'categories', label: 'Categories' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'cost', label: 'Cost' },
  { id: 'website', label: 'Website' },
  { id: 'other', label: 'Other' },
]
