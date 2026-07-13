import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared'
import { Home } from 'lucide-react'

export function HomePage() {
  return (
    <PageShell
      title="Home"
      description="Welcome to the RRCRC Community Asset Map."
    >
      <EmptyState
        title="Home page coming soon"
        description="Onboarding content for first-time visitors will appear here. Use Discover to explore community resources."
        icon={<Home className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
      />
    </PageShell>
  )
}
