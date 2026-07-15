/**
 * Shared human-readable labels for mapper note blocks.
 * Kept out of UI components so transport wording stays centralized.
 */

import type {
  AccessMode,
  AvailabilityOption,
  CostOption,
  EventCapacityMode,
  EventCostOption,
  EventFrequency,
  EventRelationshipOption,
  EventScheduleKind,
  HoursAvailability,
  PreferredContactMethod,
  RecurrenceEndKind,
  RegistrationMode,
  RelationshipOption,
} from '@/types/submission'

export const ACCESS_MODE_LABELS: Record<AccessMode, string> = {
  physical: 'Physical location',
  online: 'Online',
  both: 'Physical and online',
}

export const COST_LABELS: Record<CostOption, string> = {
  free: 'Free',
  paid: 'Paid',
  sliding_scale: 'Sliding scale',
  donation: 'Donation requested',
  not_sure: 'Not sure',
  other: 'Other',
}

export const EVENT_COST_LABELS: Record<EventCostOption, string> = {
  free: 'Free',
  free_registration: 'Free, but registration is required',
  paid: 'Paid',
  donation: 'Donation requested',
  sliding_scale: 'Sliding scale',
  not_sure: 'Not sure',
  other: 'Other',
}

export const RELATIONSHIP_LABELS: Record<RelationshipOption, string> = {
  represent: 'I represent this organization or service',
  volunteer: 'I volunteer here',
  user: 'I use this resource',
  someone_told_me: 'Someone told me about it',
  public_info: 'I found it through public information',
  other: 'Other',
}

export const EVENT_RELATIONSHIP_LABELS: Record<EventRelationshipOption, string> =
  {
    organizing: 'I am organizing or hosting it',
    represent_host: 'I represent the organization hosting it',
    volunteer: 'I volunteer with the organizers',
    public_info: 'I am sharing public information about it',
    someone_told_me: 'Someone told me about it',
    other: 'Other',
  }

export const AVAILABILITY_LABELS: Record<AvailabilityOption, string> = {
  weekdays: 'Weekdays',
  evenings: 'Evenings',
  weekends: 'Weekends',
  flexible: 'Flexible',
}

export const HOURS_AVAILABILITY_LABELS: Record<HoursAvailability, string> = {
  structured: 'Set weekly hours',
  varies: 'Hours vary',
  contact_for_hours: 'Contact the resource for hours',
}

export const PREFERRED_CONTACT_LABELS: Record<PreferredContactMethod, string> =
  {
    email: 'Email',
    phone: 'Phone',
    either: 'No preference',
  }

export const SCHEDULE_KIND_LABELS: Record<EventScheduleKind, string> = {
  one_time: 'One-time',
  recurring: 'Recurring',
}

export const FREQUENCY_LABELS: Record<EventFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
  other: 'Other',
}

export const RECURRENCE_END_LABELS: Record<RecurrenceEndKind, string> = {
  none: 'No known end date',
  end_date: 'End date',
  occurrences: 'Number of occurrences',
  not_sure: 'Not sure',
}

export const REGISTRATION_LABELS: Record<RegistrationMode, string> = {
  none: 'No registration needed',
  required: 'Registration required',
  optional: 'Registration optional',
  not_sure: 'Not sure',
}

export const CAPACITY_LABELS: Record<EventCapacityMode, string> = {
  limited: 'Limited capacity',
  not_sure: 'Not sure',
}

export const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

export const WEEKDAY_DISPLAY = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const
