import { PROGRAMMING_LANGUAGES } from '@/lib/constants'

const STORAGE_KEY = 'last-submission-language'

/**
 * The language of the last solution this browser sent, or null when there is none, it is no longer a
 * supported language, or the browser does not allow storage (private window, blocked site data).
 */
export function readLastSubmissionLanguage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return PROGRAMMING_LANGUAGES.some((l) => l.value === stored) ? stored : null
  } catch {
    return null
  }
}

/** Remembers the language of a solution that was sent, so the next submission starts with it. */
export function saveLastSubmissionLanguage(language: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Storage unavailable: there is just nothing to remember.
  }
}
