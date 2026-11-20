import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface LateRegistrationConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** Aviso antes de inscribirse a una competencia ya iniciada: la inscripción no se puede cancelar. */
export function LateRegistrationConfirmDialog({ open, onOpenChange, onConfirm }: LateRegistrationConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Inscripción tardía"
      description="La competencia ya comenzó. Una vez inscrito no podrás cancelar la inscripción. ¿Continuar?"
      confirmLabel="Inscribirme"
      variant="warning"
      onConfirm={onConfirm}
    />
  )
}
