import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Checkbox, Input } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { useGroupDeletionImpact } from '@/hooks/api/useGroups'

interface GroupDeletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupName: string
  isDeleting: boolean
  /** Called with the name typed by the person, once the confirmation is complete. */
  onConfirm: (confirmationName: string) => void
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Whoever deletes a group means to delete it, so the dialog stays as it always was (type the group's
 * name) plus a one-line summary of what goes with it. Only the dangerous case asks for more: a contest
 * running right now is deleted with the group, and that needs an explicit acknowledgement.
 */
export function GroupDeletionDialog({ open, onOpenChange, groupId, groupName, isDeleting, onConfirm }: GroupDeletionDialogProps) {
  const { data: impact, isLoading, isError, isFetching } = useGroupDeletionImpact(groupId, open)
  const [understood, setUnderstood] = useState(false)
  const [typedName, setTypedName] = useState('')

  // When the impact could not be read, assume the worst: ask for the acknowledgement too.
  const needsAcknowledgement = isError || (!!impact && impact.activeContests > 0)
  // not while the impact is being fetched again: what is on screen could be outdated (a contest may have started)
  const ready = !isFetching && (!!impact || isError) && (!needsAcknowledgement || understood) && typedName === groupName

  function handleOpenChange(next: boolean) {
    if (isDeleting) return
    onOpenChange(next)
    if (!next) {
      setUnderstood(false)
      setTypedName('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar grupo</DialogTitle>
          <DialogDescription>
            Escribe <span className="font-bold">{groupName}</span> para confirmar la eliminación. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {isLoading && <p className="text-neutral-text-muted">Calculando qué se perdería…</p>}
          {isError && (
            <p className="rounded-md border border-status-warning/30 bg-status-warning/5 p-3 text-neutral-text-primary" role="status">
              No se pudo calcular qué contiene el grupo. Si sigues, asume que se pierde todo lo que tiene.
            </p>
          )}

          {impact && (
            <p className="text-neutral-text-muted">
              Se eliminan {plural(impact.contests, 'competencia', 'competencias')} (con sus posiciones) y{' '}
              {plural(impact.materials, 'material', 'materiales')}; {plural(impact.members, 'miembro', 'miembros')}{' '}
              {impact.members === 1 ? 'deja' : 'dejan'} el grupo. Los envíos ya hechos en sus competencias se conservan, sin competencia.
            </p>
          )}

          {impact && impact.activeContests > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-status-error/40 bg-status-error/5 p-3 text-status-error" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Hay {plural(impact.activeContests, 'competencia activa', 'competencias activas')} en este momento.</strong>{' '}
                Se elimina{impact.activeContests === 1 ? '' : 'n'} con el grupo: quienes participan pierden el acceso y sus posiciones en medio de la competencia.
              </span>
            </p>
          )}

          {needsAcknowledgement && (
            <label className="flex items-start gap-3">
              <Checkbox checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} className="mt-0.5" />
              <span>
                {isError
                  ? 'Entiendo que se elimina todo lo que contiene el grupo, incluidas sus posiciones.'
                  : 'Entiendo que se eliminan las competencias activas y sus posiciones.'}
              </span>
            </label>
          )}

          <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="Nombre del grupo" autoComplete="off" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => onConfirm(typedName)} isLoading={isDeleting} disabled={!ready}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
