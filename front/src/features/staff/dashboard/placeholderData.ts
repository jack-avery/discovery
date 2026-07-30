import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  FolderTree,
  PencilLine,
  PlusCircle,
  Tag,
  Users,
} from 'lucide-react'
import { DISCOVER_OPEN_UPDATE_QUERY } from '@/features/discover/constants'
import type { CategoryChartSegment } from '@/features/staff/dashboard/DashboardCategoryBarChart'

export const PLACEHOLDER_CATEGORY_SEGMENTS: CategoryChartSegment[] = [
  { label: 'Housing', value: 121, color: '#2d6a4f' },
  { label: 'Food & Groceries', value: 96, color: '#22577a' },
  { label: 'Mental Health', value: 63, color: '#d97706' },
  { label: 'Youth Programs', value: 52, color: '#1b365d' },
  { label: 'Employment', value: 41, color: '#ca8a04' },
  { label: 'Other', value: 59, color: '#94a3b8' },
]

export interface PlaceholderQuickAction {
  id: string
  title: string
  description: string
  icon: LucideIcon
  iconClassName: string
  /** When set, the tile navigates to this path. */
  to?: string
  /** When set, the tile runs this instead of navigating. */
  onClick?: () => void
  /** When true, only administrators see this action. */
  adminOnly?: boolean
}

export const PLACEHOLDER_QUICK_ACTIONS: PlaceholderQuickAction[] = [
  {
    id: 'review-submissions',
    title: 'Review Submissions',
    description: 'Approve or reject new community resource submissions.',
    icon: ClipboardList,
    iconClassName: 'bg-primary-muted text-primary',
    to: '/staff/submissions',
  },
  {
    id: 'manage-users',
    title: 'User Management',
    description: 'Manage staff accounts, roles, and access permissions.',
    icon: Users,
    iconClassName: 'bg-primary-muted text-primary',
    to: '/staff/users',
    adminOnly: true,
  },
  {
    id: 'submit-resource',
    title: 'Submit New Resource',
    description: 'Add a new organization, service, or program to the directory.',
    icon: PlusCircle,
    iconClassName: 'bg-success/15 text-success',
    to: '/submit',
  },
  {
    id: 'update-resource',
    title: 'Update Existing Resource',
    description: 'Suggest edits to an approved community listing.',
    icon: PencilLine,
    iconClassName: 'bg-interactive-muted text-interactive',
    to: `/?${DISCOVER_OPEN_UPDATE_QUERY}=1`,
  },
  {
    id: 'manage-categories',
    title: 'Manage Categories',
    description: 'Organize how resources are grouped and discovered.',
    icon: FolderTree,
    iconClassName: 'bg-primary-muted text-primary',
  },
  {
    id: 'manage-tags',
    title: 'Manage Tags',
    description: 'Maintain tags used to filter and describe resources.',
    icon: Tag,
    iconClassName: 'bg-pending-muted text-pending',
  },
]
