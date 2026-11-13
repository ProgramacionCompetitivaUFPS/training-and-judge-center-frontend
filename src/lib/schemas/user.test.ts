import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateProfileSchema,
  setPasswordSchema,
  changeEmailSchema,
  confirmEmailChangeSchema,
  confirmDeactivationSchema,
  recoverPasswordSchema,
  resetPasswordSchema,
  adminUpdateUserSchema,
} from './user'

// ─── Shared valid passwords ────────────────────────────────────────────────────
const STRONG = 'Secret1!'

describe('loginSchema', () => {
  it('passes with valid data', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret', rememberSession: false }).success).toBe(true)
  })
  it('fails with invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'secret', rememberSession: false }).success).toBe(false)
  })
  it('fails with empty email', () => {
    expect(loginSchema.safeParse({ email: '', password: 'secret', rememberSession: false }).success).toBe(false)
  })
  it('fails with empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '', rememberSession: false }).success).toBe(false)
  })
})

describe('registerSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: STRONG,
    confirmPassword: STRONG,
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
    const r = registerSchema.safeParse({ ...valid, confirmPassword: 'Different1!' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toContain('confirmPassword')
  })
  it('fails with password shorter than 8 chars', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'Ab1!', confirmPassword: 'Ab1!' }).success).toBe(false)
  })
  it('fails with password missing uppercase', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'secret1!', confirmPassword: 'secret1!' }).success).toBe(false)
  })
  it('fails with password missing number', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'SecretAA!', confirmPassword: 'SecretAA!' }).success).toBe(false)
  })
  it('fails with password missing special char', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'SecretAA1', confirmPassword: 'SecretAA1' }).success).toBe(false)
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
  const valid = { currentPassword: 'OldPass1!', newPassword: STRONG, confirmNewPassword: STRONG }

  it('passes with valid data', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true)
  })
  it('fails when new passwords do not match', () => {
    const r = changePasswordSchema.safeParse({ ...valid, confirmNewPassword: 'Different1!' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toContain('confirmNewPassword')
  })
  it('fails with new password shorter than 8 chars', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'Ab1!', confirmNewPassword: 'Ab1!' }).success).toBe(false)
  })
  it('fails with new password missing uppercase', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'secret1!', confirmNewPassword: 'secret1!' }).success).toBe(false)
  })
  it('fails with new password missing number', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'SecretAA!', confirmNewPassword: 'SecretAA!' }).success).toBe(false)
  })
  it('fails with new password missing special char', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'SecretAA1', confirmNewPassword: 'SecretAA1' }).success).toBe(false)
  })
  it('fails with empty current password', () => {
    expect(changePasswordSchema.safeParse({ ...valid, currentPassword: '' }).success).toBe(false)
  })
})

describe('updateProfileSchema', () => {
  const valid = { name: 'Ana López', nickname: 'analopez', country: 'CO', city: 'Bogotá', institution: 'UFPS' }

  it('passes with valid data', () => {
    expect(updateProfileSchema.safeParse(valid).success).toBe(true)
  })
  it('fails with empty name', () => {
    expect(updateProfileSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })
  it('fails with invalid nickname (spaces)', () => {
    expect(updateProfileSchema.safeParse({ ...valid, nickname: 'ana lopez' }).success).toBe(false)
  })
  it('fails with nickname too short', () => {
    expect(updateProfileSchema.safeParse({ ...valid, nickname: 'ab' }).success).toBe(false)
  })
})

describe('setPasswordSchema', () => {
  const valid = { newPassword: STRONG, confirmNewPassword: STRONG }

  it('passes with valid data', () => {
    expect(setPasswordSchema.safeParse(valid).success).toBe(true)
  })
  it('fails when passwords do not match', () => {
    const r = setPasswordSchema.safeParse({ ...valid, confirmNewPassword: 'Different1!' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toContain('confirmNewPassword')
  })
  it('fails with weak password (no uppercase)', () => {
    expect(setPasswordSchema.safeParse({ newPassword: 'secret1!', confirmNewPassword: 'secret1!' }).success).toBe(false)
  })
})

describe('changeEmailSchema', () => {
  const valid = { newEmail: 'new@example.com', password: 'anypassword' }

  it('passes with valid data', () => {
    expect(changeEmailSchema.safeParse(valid).success).toBe(true)
  })
  it('fails with invalid email format', () => {
    expect(changeEmailSchema.safeParse({ ...valid, newEmail: 'not-an-email' }).success).toBe(false)
  })
  it('fails with empty email', () => {
    expect(changeEmailSchema.safeParse({ ...valid, newEmail: '' }).success).toBe(false)
  })
  it('fails with empty password', () => {
    expect(changeEmailSchema.safeParse({ ...valid, password: '' }).success).toBe(false)
  })
})

describe('confirmEmailChangeSchema', () => {
  it('passes with a code', () => {
    expect(confirmEmailChangeSchema.safeParse({ code: '123456' }).success).toBe(true)
  })
  it('fails with empty code', () => {
    expect(confirmEmailChangeSchema.safeParse({ code: '' }).success).toBe(false)
  })
})

describe('confirmDeactivationSchema', () => {
  it('passes with a code', () => {
    expect(confirmDeactivationSchema.safeParse({ code: '123456' }).success).toBe(true)
  })
  it('fails with empty code', () => {
    expect(confirmDeactivationSchema.safeParse({ code: '' }).success).toBe(false)
  })
})

describe('recoverPasswordSchema', () => {
  it('passes with valid email', () => {
    expect(recoverPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
  })
  it('fails with invalid email', () => {
    expect(recoverPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })
  it('fails with empty email', () => {
    expect(recoverPasswordSchema.safeParse({ email: '' }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  const valid = { email: 'a@b.com', code: '123456', newPassword: STRONG, confirmPassword: STRONG }

  it('passes with valid data', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true)
  })
  it('fails when passwords do not match', () => {
    const r = resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'Different1!' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toContain('confirmPassword')
  })
  it('fails with invalid email', () => {
    expect(resetPasswordSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false)
  })
  it('fails with empty code', () => {
    expect(resetPasswordSchema.safeParse({ ...valid, code: '' }).success).toBe(false)
  })
  it('fails with weak password', () => {
    expect(resetPasswordSchema.safeParse({ ...valid, newPassword: 'weakpass', confirmPassword: 'weakpass' }).success).toBe(false)
  })
})

describe('adminUpdateUserSchema', () => {
  it('passes with empty object (all fields optional)', () => {
    expect(adminUpdateUserSchema.safeParse({}).success).toBe(true)
  })
  it('passes with partial valid fields', () => {
    expect(adminUpdateUserSchema.safeParse({ name: 'Admin User', role: 'COACH' }).success).toBe(true)
  })
  it('fails with invalid role', () => {
    expect(adminUpdateUserSchema.safeParse({ role: 'SUPERADMIN' }).success).toBe(false)
  })
  it('fails with nickname containing spaces when provided', () => {
    expect(adminUpdateUserSchema.safeParse({ nickname: 'bad nick' }).success).toBe(false)
  })
  it('fails with invalid email when provided', () => {
    expect(adminUpdateUserSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })
})
