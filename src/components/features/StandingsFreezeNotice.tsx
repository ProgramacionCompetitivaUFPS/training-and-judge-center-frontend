interface StandingsFreezeNoticeProps {
  realtime: boolean
}

export function StandingsFreezeNotice({ realtime }: StandingsFreezeNoticeProps) {
  if (realtime) {
    return (
      <div role="status" className="rounded-md bg-neutral-text-primary p-3 text-sm text-neutral-text-inverse">
        <strong className="font-bold">Estás viendo los resultados reales.</strong> Los participantes ven la tabla congelada. Un envío nuevo puede tardar unos segundos en reflejarse.
      </div>
    )
  }

  return (
    <div role="status" className="border rounded-md p-3 text-sm bg-status-warning/10 border-status-warning/30 text-status-warning">
      La tabla de posiciones está congelada. Los envíos posteriores al congelamiento se muestran con un ? y la cantidad de envíos debajo, y se revelarán al terminar la competencia.
    </div>
  )
}
