import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { CodeViewer } from '@/components/features/CodeViewer'
import { useProblemSourceFile } from '@/hooks/api/useProblems'
import { getErrorMessage } from '@/lib/errorMessages'
import { formatBytes } from '@/lib/utils'
import type { ProblemSourceFileType } from '@/types/problem'

export interface SourceFileTarget {
  fileType: ProblemSourceFileType
  /** Which solution; checker and validator have only one. */
  fileName?: string
  /** What to call it in the title ("Checker", "sol.cpp"). */
  label: string
}

interface SourceFileDialogProps {
  slug: string
  target: SourceFileTarget | null
  onClose: () => void
}

/** Read-only view of the code the judge runs: a solution, the checker or the validator. */
export function SourceFileDialog({ slug, target, onClose }: SourceFileDialogProps) {
  const { data, isLoading, isError, error } = useProblemSourceFile(
    slug,
    target?.fileType ?? 'checker',
    target?.fileName,
    !!target,
  )

  return (
    <Dialog open={!!target} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono">{data?.filename ?? target?.label}</span>
            {data && <Badge variant="outline" className="text-[10px]">{data.language}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {data ? formatBytes(data.sizeBytes) : 'Código que el juez usa para este problema.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && <p className="text-sm text-status-error">{getErrorMessage(error)}</p>}

        {data && (
          <div className="space-y-2 min-w-0">
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-neutral-border">
              <CodeViewer code={data.content} language={data.language} />
            </div>
            {data.truncated && (
              <p className="flex items-center gap-1.5 text-xs text-status-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Se muestran solo los primeros 256 KB de {formatBytes(data.sizeBytes)}.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
