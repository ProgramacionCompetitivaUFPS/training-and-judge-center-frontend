import { describe, it, expect } from 'vitest'

import { isValidBalloonColor, resolveBalloonColor } from './balloon'

describe('isValidBalloonColor', () => {
  it.each([
    ['#e11d48', true],
    ['#E11D48', true],
    ['#fff', false],
    ['red', false],
    ['', false],
    ['e11d48', false],
    ['#GGGGGG', false],
  ])('para %j retorna %s', (value, expected) => {
    expect(isValidBalloonColor(value)).toBe(expected)
  })

  it('retorna false para valores que no son string', () => {
    expect(isValidBalloonColor(null)).toBe(false)
    expect(isValidBalloonColor(42)).toBe(false)
  })
})

describe('resolveBalloonColor', () => {
  it('devuelve el color en minúsculas cuando es válido', () => {
    expect(resolveBalloonColor('#2563EB')).toBe('#2563eb')
  })

  it.each<string | null | undefined>([null, undefined, 'red', '#fff'])(
    'devuelve blanco para %j',
    (color) => {
      expect(resolveBalloonColor(color)).toBe('#ffffff')
    },
  )
})
