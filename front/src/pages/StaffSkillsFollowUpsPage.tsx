import { PageShell } from '@/components/shared/PageShell'
import { SkillsFollowUpsWorkspace } from '@/features/staff/skillsFollowUps'

/**
 * Staff Skills Follow-ups — moderator+ (same gate as GET /skills-follow-ups).
 * Accessible to all authenticated staff portal roles via RequireAuth.
 */
export function StaffSkillsFollowUpsPage() {
  return (
    <PageShell
      title="Skills Follow-ups"
      description="Community members whose submitted skills or services were accepted for staff follow-up."
    >
      <SkillsFollowUpsWorkspace />
    </PageShell>
  )
}
