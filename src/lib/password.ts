// Special characters accepted by the backend password policy (internal/domain/user/password.go)
export const PASSWORD_SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:',.<>?/]/

export interface PasswordStrength {
  level: 1 | 2 | 3
  label: string
  color: string
}

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (PASSWORD_SPECIAL_CHARS_REGEX.test(password)) score++
  if (score <= 1) return { level: 1, label: 'Débil', color: 'bg-status-error' }
  if (score <= 3) return { level: 2, label: 'Media', color: 'bg-status-warning' }
  return { level: 3, label: 'Fuerte', color: 'bg-status-success' }
}
