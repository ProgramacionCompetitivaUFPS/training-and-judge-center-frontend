import { describe, it, expect } from 'vitest'

import { autoRevealModeOf, autoRevealDelayOf, isFreezeEnabled, toAutoRevealMinutes } from './autoReveal'
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
