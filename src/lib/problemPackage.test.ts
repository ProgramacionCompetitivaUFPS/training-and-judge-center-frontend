import { describe, it, expect } from 'vitest'
import { PACKAGE_LIMITS } from './problemPackage'

describe('PACKAGE_LIMITS', () => {
  it('maxTotalBytes es 150 MB', () => {
    expect(PACKAGE_LIMITS.maxTotalBytes).toBe(150 * 1024 * 1024)
  })
  it('maxInputBytes es 64 MB', () => {
    expect(PACKAGE_LIMITS.maxInputBytes).toBe(64 * 1024 * 1024)
  })
  it('maxAnswerBytes es 8 MB', () => {
    expect(PACKAGE_LIMITS.maxAnswerBytes).toBe(8 * 1024 * 1024)
  })
  it('maxAuxBytes es 2 MB', () => {
    expect(PACKAGE_LIMITS.maxAuxBytes).toBe(2 * 1024 * 1024)
  })
})
