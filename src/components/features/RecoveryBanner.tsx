import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import type { RecoverableSubmission } from '@/hooks/useSubmissionRecovery'

interface RecoveryBannerProps {
  submission: RecoverableSubmission
  isLoaded: boolean
  contestContext?: string
  onLoadClick: () => void
}

export function RecoveryBanner({ submission, isLoaded, contestContext, onLoadClick }: RecoveryBannerProps) {
  const variant = submission.isBlockly ? 'info' : 'default'

  const contextText = contestContext
    ? `Último intento en ${contestContext}`
    : 'Último intento en práctica'

  return (
    <Alert variant={variant}>
      <AlertDescription>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <SubmissionStatusBadge status={submission.status} />
            <span className="text-sm">
              {isLoaded
                ? `Contenido cargado desde submission #${submission.id.slice(0, 8)}`
                : contextText}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadClick}
            disabled={isLoaded}
          >
            {isLoaded ? 'Cargado' : 'Cargar último intento'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
