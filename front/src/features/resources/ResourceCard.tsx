import { Clock, MapPin, Phone } from 'lucide-react'
import type { Category, Resource, Tag } from '@/types'
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui'

interface ResourceCardProps {
  resource: Resource
  categories?: Category[]
  tags?: Tag[]
}

function resolveCategoryName(categoryId: string, categories?: Category[]) {
  return categories?.find((c) => c.id === categoryId)?.name
}

function resolveTagNames(tagIds: string[] | undefined, tags?: Tag[]) {
  if (!tagIds?.length || !tags?.length) return []
  return tagIds
    .map((id) => tags.find((t) => t.id === id)?.name)
    .filter((name): name is string => Boolean(name))
}

export function ResourceCard({
  resource,
  categories,
  tags,
}: ResourceCardProps) {
  const isPending = resource.status === 'pending'
  const categoryName = resolveCategoryName(resource.categoryId, categories)
  const tagNames = resolveTagNames(resource.tagIds, tags)

  return (
    <Card className="transition-colors hover:border-interactive/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">{resource.name}</h3>
            {categoryName && (
              <p className="mt-0.5 text-xs text-muted-foreground">{categoryName}</p>
            )}
          </div>
          {isPending && <Badge variant="pending">Pending review</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{resource.description}</p>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{resource.address}</span>
          </div>
          {resource.hours && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{resource.hours}</span>
            </div>
          )}
          {resource.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <a href={`tel:${resource.phone}`} className="hover:text-interactive">
                {resource.phone}
              </a>
            </div>
          )}
        </div>

        {tagNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagNames.map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </div>
        )}

        <Button size="sm" variant="outline" className="w-full">
          View details
        </Button>
      </CardContent>
    </Card>
  )
}
