import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { readLastSubmissionLanguage, saveLastSubmissionLanguage } from './lastSubmissionLanguage'

describe('lastSubmissionLanguage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('returns what was saved', () => {
    // Arrange
    saveLastSubmissionLanguage('python310')

    // Act / Assert
    expect(readLastSubmissionLanguage()).toBe('python310')
  })

  it('keeps only the most recent language', () => {
    // Arrange
    saveLastSubmissionLanguage('cpp20')
    saveLastSubmissionLanguage('java17')

    // Act / Assert
    expect(readLastSubmissionLanguage()).toBe('java17')
  })

  it('returns null when nothing was saved', () => {
    expect(readLastSubmissionLanguage()).toBeNull()
  })

  it('ignores a stored value that is not a supported language', () => {
    // Arrange: e.g. a language that was removed since it was saved
    localStorage.setItem('last-submission-language', 'cobol')

    // Act / Assert
    expect(readLastSubmissionLanguage()).toBeNull()
  })

  it('returns null instead of throwing when the browser does not allow storage', () => {
    // Arrange: private windows and blocked site data can make the accessor throw
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    // Act / Assert
    expect(readLastSubmissionLanguage()).toBeNull()
  })

  it('does not throw when the browser does not allow storing', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    // Act / Assert
    expect(() => saveLastSubmissionLanguage('cpp20')).not.toThrow()
  })
})
