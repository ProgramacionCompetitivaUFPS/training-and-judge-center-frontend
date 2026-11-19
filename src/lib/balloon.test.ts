import { describe, it, expect } from 'vitest'

import { BALLOON_PALETTE, isValidBalloonColor, readableTextColor, resolveBalloonColor } from './balloon'

describe('BALLOON_PALETTE', () => {
  it('tiene 12 colores válidos y sin repetir', () => {
    expect(BALLOON_PALETTE).toHaveLength(12)
    expect(BALLOON_PALETTE.every((c) => isValidBalloonColor(c) && c === c.toLowerCase())).toBe(true)
    expect(new Set(BALLOON_PALETTE).size).toBe(12)
  })
})

describe('readableTextColor', () => {
  it.each([
    ['#ffffff', '#1c1517'],
    ['#f59e0b', '#1c1517'],
    ['#e11d48', '#ffffff'],
    ['#2563eb', '#ffffff'],
    ['#000000', '#ffffff'],
  ])('para el fondo %s usa el texto %s', (background, text) => {
    expect(readableTextColor(background)).toBe(text)
  })

  it('trata un color inválido como blanco (texto oscuro)', () => {
    expect(readableTextColor('red')).toBe('#1c1517')
  })
})

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
