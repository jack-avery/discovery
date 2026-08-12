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
  /**
   * When true, only staff_editor+ see this action
   * (`canManageCategories` / `canManageTags` — same backend boundary).
   */
  staffEditorOnly?: boolean
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
    staffEditorOnly: true,
  },
  {
    id: 'manage-tags',
    title: 'Manage Filters',
    description: 'Maintain filters used to discover and describe resources.',
    icon: Tag,
    iconClassName: 'bg-pending-muted text-pending',
    staffEditorOnly: true,
  },
]
