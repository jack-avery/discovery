export type ResourceStatus = 'published' | 'pending' | 'rejected'

export interface Resource {
  id: string
  name: string
  categoryId: string
  description: string
  address: string
  hours?: string
  phone?: string
  tagIds?: string[]
  status?: ResourceStatus
}
