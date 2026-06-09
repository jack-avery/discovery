import type { Category, Tag } from '@/types'

/**
 * Temporary catalog data — replace catalog.ts fetch implementations
 * with API calls when the backend is available.
 */
export const mockCategories: Category[] = [
  { id: 'cat-food-support', slug: 'food-support', name: 'Food Support' },
  { id: 'cat-housing', slug: 'housing', name: 'Housing' },
  { id: 'cat-mental-health', slug: 'mental-health', name: 'Mental Health' },
  { id: 'cat-healthcare', slug: 'healthcare', name: 'Healthcare' },
  { id: 'cat-employment', slug: 'employment', name: 'Employment' },
  { id: 'cat-education', slug: 'education', name: 'Education' },
  { id: 'cat-recreation', slug: 'recreation', name: 'Recreation' },
  { id: 'cat-transportation', slug: 'transportation', name: 'Transportation' },
]

export const mockTags: Tag[] = [
  { id: 'tag-youth', slug: 'youth', name: 'Youth' },
  { id: 'tag-seniors', slug: 'seniors', name: 'Seniors' },
  { id: 'tag-families', slug: 'families', name: 'Families' },
  { id: 'tag-newcomers', slug: 'newcomers', name: 'Newcomers' },
  { id: 'tag-emergency', slug: 'emergency', name: 'Emergency' },
  { id: 'tag-free', slug: 'free', name: 'Free' },
  { id: 'tag-accessible', slug: 'accessible', name: 'Accessible' },
  { id: 'tag-indigenous', slug: 'indigenous', name: 'Indigenous' },
]
