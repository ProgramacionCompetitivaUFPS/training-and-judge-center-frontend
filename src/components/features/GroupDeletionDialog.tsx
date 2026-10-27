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
  /** Called with the name typed by the person, once every confirmation is given. */
  onConfirm: (confirmationName: string) => void
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Deleting a group is deliberate (whoever gets here means to remove it), but it takes a lot with it:
 * its contests, running ones included, their standings, its materials and its memberships. The dialog
 * shows what is lost and asks for a confirmation in steps: acknowledge, and, when contests or contest
 * submissions are involved, acknowledge what that costs, and finally type the group's name.
 */
export function GroupDeletionDialog({ open, onOpenChange, groupId, groupName, isDeleting, onConfirm }: GroupDeletionDialogProps) {
  const { data: impact, isLoading, isError } = useGroupDeletionImpact(groupId, open)
  const [understood, setUnderstood] = useState(false)
  const [understoodLoss, setUnderstoodLoss] = useState(false)
  const [typedName, setTypedName] = useState('')

  // When the impact could not be read, assume the worst: ask for the extra acknowledgement too.
  const isSevere = isError || (!!impact && (impact.activeContests > 0 || impact.submissions > 0 || impact.contests > 0))
  const ready = !!(impact || isError) && understood && (!isSevere || understoodLoss) && typedName === groupName

  function handleOpenChange(next: boolean) {
    if (isDeleting) return
    onOpenChange(next)
    if (!next) {
      setUnderstood(false)
      setUnderstoodLoss(false)
      setTypedName('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Eliminar grupo</DialogTitle>
          <DialogDescription>
            Vas a eliminar <span className="font-bold">{groupName}</span>. Esta acción no se puede deshacer.
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
            <>
              <ul className="rounded-md border border-neutral-border divide-y divide-neutral-border" aria-label="Lo que se elimina con el grupo">
                <li className="px-3 py-2">{plural(impact.contests, 'competencia', 'competencias')} (con sus posiciones e inscripciones)</li>
                <li className="px-3 py-2">{plural(impact.materials, 'material', 'materiales')}</li>
                <li className="px-3 py-2">{plural(impact.members, 'miembro', 'miembros')} {impact.members === 1 ? 'deja' : 'dejan'} de pertenecer al grupo</li>
                <li className="px-3 py-2">
                  {plural(impact.submissions, 'envío hecho', 'envíos hechos')} en sus competencias {impact.submissions === 1 ? 'se conserva' : 'se conservan'}, pero {impact.submissions === 1 ? 'queda' : 'quedan'} sin competencia
                </li>
              </ul>

              {impact.activeContests > 0 && (
                <p className="flex items-start gap-2 rounded-md border border-status-error/40 bg-status-error/5 p-3 text-status-error" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>
                      Hay {plural(impact.activeContests, 'competencia activa', 'competencias activas')} en este momento.
                    </strong>{' '}
                    Se elimina{impact.activeContests === 1 ? '' : 'n'} con el grupo: quienes participan pierden el acceso y sus posiciones en medio de la competencia.
                  </span>
                </p>
              )}
            </>
          )}

          <label className="flex items-start gap-3">
            <Checkbox checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} className="mt-0.5" />
            <span>Entiendo que el grupo, sus competencias y sus materiales se eliminan para siempre.</span>
          </label>

          {isSevere && (
            <label className="flex items-start gap-3">
              <Checkbox checked={understoodLoss} onCheckedChange={(v) => setUnderstoodLoss(v === true)} className="mt-0.5" />
              <span>
                Entiendo que se pierden las posiciones de las competencias (el resultado oficial) y que los envíos hechos en ellas quedan sin competencia.
              </span>
            </label>
          )}

          <Input
            label={`Escribe «${groupName}» para confirmar`}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Nombre del grupo"
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => onConfirm(typedName)} isLoading={isDeleting} disabled={!ready}>
            Eliminar grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
