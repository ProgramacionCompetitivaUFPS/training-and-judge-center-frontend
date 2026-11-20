import { useState } from 'react'
import { Trophy } from 'lucide-react'

import { Button } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToastContext } from '@/hooks/useToastContext'
import { useRevealContestResults } from '@/hooks/api/useContests'
import { getErrorMessage } from '@/lib/errorMessages'

interface RevealResultsButtonProps {
  groupId: string
  contestId: string
}

/** Botón «Revelar resultados» con confirmación: publica la tabla final de un contest congelado. */
export function RevealResultsButton({ groupId, contestId }: RevealResultsButtonProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToastContext()
  const mutation = useRevealContestResults()

  function handleConfirm() {
    mutation.mutate(
      { groupId, contestId },
      {
        onSuccess: () =>
          toast({
            variant: 'success',
            title: 'Resultados revelados',
            description: 'Los participantes ya pueden ver la tabla final',
          }),
        onError: (error) =>
          toast({ variant: 'error', title: 'No se pudo revelar', description: getErrorMessage(error) }),
        onSettled: () => setOpen(false),
      },
    )
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Trophy aria-hidden="true" className="h-4 w-4" />
        Revelar resultados
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Revelar resultados"
        description="Se publicará la tabla de posiciones final y los envíos completos para todos los participantes. Esta acción no se puede deshacer."
        confirmLabel="Revelar"
        variant="warning"
        isLoading={mutation.isPending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
