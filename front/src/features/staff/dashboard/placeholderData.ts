import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  FilePenLine,
  FolderTree,
  MapPin,
  PencilLine,
  PlusCircle,
  Tag,
} from 'lucide-react'
import type { DonutChartSegment } from '@/features/staff/dashboard/DashboardDonutChart'

export const PLACEHOLDER_STATS = {
  publishedResources: 432,
  pendingReviews: 18,
  resourceUpdates: 7,
} as const

export const PLACEHOLDER_CATEGORY_SEGMENTS: DonutChartSegment[] = [
  { label: 'Housing', value: 121, color: '#2d6a4f' },
  { label: 'Food & Groceries', value: 96, color: '#22577a' },
  { label: 'Mental Health', value: 63, color: '#d97706' },
  { label: 'Youth Programs', value: 52, color: '#1b365d' },
  { label: 'Employment', value: 41, color: '#ca8a04' },
  { label: 'Other', value: 59, color: '#94a3b8' },
]

export type SubmissionBadgeVariant = 'success' | 'pending' | 'primary'

export interface PlaceholderSubmissionRow {
  id: number
  title: string
  submitter: string
  badgeLabel: string
  badgeVariant: SubmissionBadgeVariant
  relativeTime: string
  icon: LucideIcon
}

export const PLACEHOLDER_RECENT_SUBMISSIONS: PlaceholderSubmissionRow[] = [
  {
    id: 1,
    title: 'Kanata Food Bank',
    submitter: 'Sarah Chen',
    badgeLabel: 'New Resource',
    badgeVariant: 'success',
    relativeTime: '2h ago',
    icon: MapPin,
  },
  {
    id: 2,
    title: 'Rideau Community Centre',
    submitter: 'James Okonkwo',
    badgeLabel: 'Resource Update',
    badgeVariant: 'pending',
    relativeTime: '4h ago',
    icon: FilePenLine,
  },
  {
    id: 3,
    title: 'Free Tax Clinic — March',
    submitter: 'Maria Santos',
    badgeLabel: 'New Resource',
    badgeVariant: 'success',
    relativeTime: '6h ago',
    icon: ClipboardList,
  },
  {
    id: 4,
    title: 'Vanier Neighbourhood Hub',
    submitter: 'David Kim',
    badgeLabel: 'Resource Update',
    badgeVariant: 'pending',
    relativeTime: '1d ago',
    icon: FilePenLine,
  },
  {
    id: 5,
    title: 'Youth Mentorship Program',
    submitter: 'Aisha Patel',
    badgeLabel: 'New Resource',
    badgeVariant: 'success',
    relativeTime: '1d ago',
    icon: MapPin,
  },
]

export interface PlaceholderQuickAction {
  id: string
  title: string
  description: string
  icon: LucideIcon
  iconClassName: string
}

export const PLACEHOLDER_QUICK_ACTIONS: PlaceholderQuickAction[] = [
  {
    id: 'review-submissions',
    title: 'Review Submissions',
    description: 'Approve or reject new community resource submissions.',
    icon: ClipboardList,
    iconClassName: 'bg-primary-muted text-primary',
  },
  {
    id: 'review-updates',
    title: 'Review Resource Updates',
    description: 'Review proposed changes to existing listings.',
    icon: FilePenLine,
    iconClassName: 'bg-pending-muted text-pending',
  },
  {
    id: 'submit-resource',
    title: 'Submit New Resource',
    description: 'Add a new organization, service, or program to the directory.',
    icon: PlusCircle,
    iconClassName: 'bg-success/15 text-success',
  },
  {
    id: 'update-resource',
    title: 'Update Existing Resource',
    description: 'Suggest edits to an approved community listing.',
    icon: PencilLine,
    iconClassName: 'bg-interactive-muted text-interactive',
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
