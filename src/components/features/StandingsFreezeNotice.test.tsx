import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandingsFreezeNotice } from './StandingsFreezeNotice'
import { formatDateTz } from '@/lib/utils'

describe('StandingsFreezeNotice', () => {
  it('avisa que la tabla está congelada y que se revelará al publicarse los resultados cuando no es tiempo real', () => {
    render(<StandingsFreezeNotice realtime={false} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'La tabla de posiciones está congelada. Los envíos posteriores al congelamiento se muestran con un ? y la cantidad de envíos debajo, y se revelarán cuando se publiquen los resultados.',
    )
  })

  it('avisa que se ven los resultados reales y no menciona el congelamiento final cuando es tiempo real', () => {
    render(<StandingsFreezeNotice realtime={true} />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(
      'Estás viendo los resultados reales. Los participantes ven la tabla congelada. Un envío nuevo puede tardar unos segundos en reflejarse.',
    )
    expect(status).not.toHaveTextContent('se revelarán cuando se publiquen los resultados')
  })

  it('indica la fecha de revelado automático cuando la competencia terminó y tiene autoRevealAt', () => {
    render(<StandingsFreezeNotice realtime={false} awaitingReveal autoRevealAt="2026-11-20T18:00:00.000Z" />)

    expect(screen.getByRole('status')).toHaveTextContent(
      `La competencia terminó, pero los resultados aún no se revelan. Se revelarán automáticamente el ${formatDateTz('2026-11-20T18:00:00.000Z')}.`,
    )
  })

  it('pide a un líder o admin revelar cuando la competencia terminó sin autoRevealAt', () => {
    render(<StandingsFreezeNotice realtime={false} awaitingReveal autoRevealAt={null} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'La competencia terminó, pero los resultados aún no se revelan. Los revelará un líder del grupo o un administrador.',
    )
  })

  it('mantiene el aviso de resultados reales en tiempo real aunque la competencia espere revelado', () => {
    render(<StandingsFreezeNotice realtime={true} awaitingReveal autoRevealAt={null} />)

    expect(screen.getByRole('status')).toHaveTextContent('Estás viendo los resultados reales.')
  })
})
