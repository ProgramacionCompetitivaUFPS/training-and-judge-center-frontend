import { formatDateTz } from '@/lib/utils'

interface StandingsFreezeNoticeProps {
  realtime: boolean
  awaitingReveal?: boolean
  autoRevealAt?: string | null
}

/** Texto del aviso fuera de tiempo real: según si la competencia terminó y si tiene fecha de revelado automático. */
function noticeText(awaitingReveal: boolean, autoRevealAt: string | null): string {
  if (!awaitingReveal) {
    return 'La tabla de posiciones está congelada. Los envíos posteriores al congelamiento se muestran con un ? y la cantidad de envíos debajo, y se revelarán cuando se publiquen los resultados.'
  }
  if (autoRevealAt) {
    return `La competencia terminó, pero los resultados aún no se revelan. Se revelarán automáticamente el ${formatDateTz(autoRevealAt)}.`
  }
  return 'La competencia terminó, pero los resultados aún no se revelan. Los revelará un líder del grupo o un administrador.'
}

export function StandingsFreezeNotice({ realtime, awaitingReveal = false, autoRevealAt = null }: StandingsFreezeNoticeProps) {
  if (realtime) {
    return (
      <div role="status" className="rounded-md bg-neutral-text-primary p-3 text-sm text-neutral-text-inverse">
        <strong className="font-bold">Estás viendo los resultados reales.</strong> Los participantes ven la tabla congelada. Un envío nuevo puede tardar unos segundos en reflejarse.
      </div>
    )
  }

  return (
    <div role="status" className="border rounded-md p-3 text-sm bg-status-warning/10 border-status-warning/30 text-status-warning">
      {noticeText(awaitingReveal, autoRevealAt)}
    </div>
  )
}
