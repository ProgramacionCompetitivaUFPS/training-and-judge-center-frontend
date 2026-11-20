import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandingsFreezeNotice } from './StandingsFreezeNotice'

describe('StandingsFreezeNotice', () => {
  it('avisa que la tabla está congelada y que se revelará al terminar cuando no es tiempo real', () => {
    render(<StandingsFreezeNotice realtime={false} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'La tabla de posiciones está congelada. Los envíos posteriores al congelamiento se muestran con un ? y la cantidad de envíos debajo, y se revelarán al terminar la competencia.',
    )
  })

  it('avisa que se ven los resultados reales y no menciona el congelamiento final cuando es tiempo real', () => {
    render(<StandingsFreezeNotice realtime={true} />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(
      'Estás viendo los resultados reales. Los participantes ven la tabla congelada. Un envío nuevo puede tardar unos segundos en reflejarse.',
    )
    expect(status).not.toHaveTextContent('se revelarán al terminar la competencia')
  })
})
