import { describe, it, expect } from 'vitest'

import type { ContestStatus } from '@/types/contest'

import { isAwaitingReveal } from './contestReveal'

const CASES: [ContestStatus | undefined, boolean | undefined, boolean][] = [
  ['FINISHED', true, true],
  ['FINISHED', false, false],
  ['ACTIVE', true, false],
  ['SCHEDULED', false, false],
  [undefined, true, false],
  ['FINISHED', undefined, false],
]

describe('isAwaitingReveal', () => {
  it.each(CASES)('con estado %s e isFrozen=%s devuelve %s', (status, isFrozen, expected) => {
    expect(isAwaitingReveal({ status, isFrozen })).toBe(expected)
  })
})
