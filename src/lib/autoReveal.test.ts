import { describe, it, expect } from 'vitest'

import { autoRevealDraftOf, autoRevealModeOf, autoRevealDelayOf, isFreezeEnabled, parseAutoRevealDelay, toAutoRevealMinutes } from './autoReveal'
import type { AutoRevealMode } from './autoReveal'

describe('autoRevealModeOf', () => {
  it.each([
    [null, 'manual'],
    [undefined, 'manual'],
    [0, 'onFinish'],
    [30, 'delay'],
  ] as [number | null | undefined, AutoRevealMode][])('minutos %s → modo %s', (minutes, expected) => {
    expect(autoRevealModeOf(minutes)).toBe(expected)
  })
})

describe('autoRevealDelayOf', () => {
  it.each([
    [null, undefined],
    [0, undefined],
    [30, 30],
  ] as [number | null, number | undefined][])('minutos %s → espera %s', (minutes, expected) => {
    expect(autoRevealDelayOf(minutes)).toBe(expected)
  })
})

describe('toAutoRevealMinutes', () => {
  it.each([
    ['manual', undefined, null],
    ['manual', 45, null],
    ['onFinish', 45, 0],
    ['delay', 45, 45],
    ['delay', undefined, null],
  ] as [AutoRevealMode, number | undefined, number | null][])(
    'modo %s con espera %s → %s',
    (mode, delay, expected) => {
      expect(toAutoRevealMinutes(mode, delay)).toBe(expected)
    },
  )
})

describe('isFreezeEnabled', () => {
  it.each([
    [30, true],
    ['30', true],
    [1, true],
    [0, false],
    ['0', false],
    [-5, false],
    ['-5', false],
    [null, false],
    [undefined, false],
    ['', false],
    [Number.NaN, false],
  ] as [number | string | null | undefined, boolean][])('freeze %j → %s', (freeze, expected) => {
    expect(isFreezeEnabled(freeze)).toBe(expected)
  })
})

describe('parseAutoRevealDelay', () => {
  it.each([
    ['45', 45],
    [45, 45],
    ['', undefined],
    [null, undefined],
    [undefined, undefined],
    ['abc', undefined],
    [Number.NaN, undefined],
  ] as [string | number | null | undefined, number | undefined][])('%j → %s', (raw, expected) => {
    expect(parseAutoRevealDelay(raw)).toBe(expected)
  })
})

describe('autoRevealDraftOf', () => {
  it.each([
    [30, 'delay', 30],
    [null, 'manual', undefined],
    [undefined, 'manual', undefined],
    [0, 'onFinish', undefined],
  ] as [number | null | undefined, AutoRevealMode, number | undefined][])(
    'guardado %s, modo %s y espera %s coincide con lo guardado: no hay borrador',
    (saved, mode, delay) => {
      expect(autoRevealDraftOf(saved, mode, delay)).toBeNull()
    },
  )

  it.each([
    [30, 'delay', 45],
    [30, 'manual', undefined],
    [30, 'delay', undefined],
    [null, 'delay', undefined],
    [0, 'delay', 0],
  ] as [number | null, AutoRevealMode, number | undefined][])(
    'guardado %s, modo %s y espera %s difiere de lo guardado: conserva modo y espera juntos',
    (saved, mode, delay) => {
      expect(autoRevealDraftOf(saved, mode, delay)).toEqual({ mode, delay })
    },
  )
})
