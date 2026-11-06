import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, changePasswordSchema } from './user'

describe('loginSchema', () => {
  it('passes with valid data', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'secret', rememberSession: false })
    expect(result.success).toBe(true)
  })
  it('fails with invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret', rememberSession: false })
    expect(result.success).toBe(false)
  })
  it('fails with empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret', rememberSession: false })
    expect(result.success).toBe(false)
  })
  it('fails with empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '', rememberSession: false })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'Secret1!',
    confirmPassword: 'Secret1!',
    name: 'Ana López',
    nickname: 'analopez',
    country: 'CO',
    city: 'Bogotá',
    institution: 'UFPS',
  }

  it('passes with valid data', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('fails when passwords do not match', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Different1!' })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.path[0])).toContain('confirmPassword')
  })

  it('fails with password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'Ab1!', confirmPassword: 'Ab1!' })
    expect(result.success).toBe(false)
  })

  it('fails with password missing uppercase', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'secret1!', confirmPassword: 'secret1!' })
    expect(result.success).toBe(false)
  })

  it('fails with password missing number', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'SecretAA!', confirmPassword: 'SecretAA!' })
    expect(result.success).toBe(false)
  })

  it('fails with password missing special char', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'SecretAA1', confirmPassword: 'SecretAA1' })
    expect(result.success).toBe(false)
  })

  it('fails with nickname containing spaces', () => {
    expect(registerSchema.safeParse({ ...valid, nickname: 'ana lopez' }).success).toBe(false)
  })

  it('fails with nickname shorter than 3 chars', () => {
    expect(registerSchema.safeParse({ ...valid, nickname: 'ab' }).success).toBe(false)
  })

  it('fails with nickname longer than 30 chars', () => {
    expect(registerSchema.safeParse({ ...valid, nickname: 'a'.repeat(31) }).success).toBe(false)
  })

  it('fails with empty name', () => {
    expect(registerSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })
})

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'OldPass1!',
    newPassword: 'NewPass1!',
    confirmNewPassword: 'NewPass1!',
  }

  it('passes with valid data', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true)
  })

  it('fails when new passwords do not match', () => {
    const result = changePasswordSchema.safeParse({ ...valid, confirmNewPassword: 'Different1!' })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.path[0])).toContain('confirmNewPassword')
  })

  it('fails with new password shorter than 8 chars', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: 'Ab1!', confirmNewPassword: 'Ab1!' })
    expect(result.success).toBe(false)
  })

  it('fails with empty current password', () => {
    expect(changePasswordSchema.safeParse({ ...valid, currentPassword: '' }).success).toBe(false)
  })
})
