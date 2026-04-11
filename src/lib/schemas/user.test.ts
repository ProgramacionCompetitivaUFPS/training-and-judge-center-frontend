import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
  recoverPasswordSchema,
  resetPasswordSchema,
  adminUpdateUserSchema,
} from './user'

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email with Spanish message', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path.includes('email'))
      expect(emailError?.message).toBe('El correo es requerido')
    }
  })

  it('rejects invalid email format with Spanish message', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path.includes('email'))
      expect(emailError?.message).toBe('Correo electrónico inválido')
    }
  })

  it('rejects missing password with Spanish message', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwError = result.error.issues.find((i) => i.path.includes('password'))
      expect(pwError?.message).toBe('La contraseña es requerida')
    }
  })
})

describe('registerSchema', () => {
  const validData = {
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    name: 'Test User',
    nickname: 'testuser',
    country: 'CO',
    city: 'Bogotá',
    institution: 'Universidad Nacional',
  }

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ ...validData, password: 'short', confirmPassword: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwError = result.error.issues.find((i) => i.path.includes('password'))
      expect(pwError?.message).toBe('La contraseña debe tener al menos 8 caracteres')
    }
  })

  it('rejects password exceeding 72 characters', () => {
    const longPw = 'a'.repeat(73)
    const result = registerSchema.safeParse({ ...validData, password: longPw, confirmPassword: longPw })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwError = result.error.issues.find((i) => i.path.includes('password'))
      expect(pwError?.message).toBe('La contraseña no puede exceder 72 caracteres')
    }
  })

  it('rejects mismatched passwords on confirmPassword path', () => {
    const result = registerSchema.safeParse({ ...validData, confirmPassword: 'different123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find((i) => i.path.includes('confirmPassword'))
      expect(confirmError?.message).toBe('Las contraseñas no coinciden')
    }
  })

  it('rejects nickname with invalid characters', () => {
    const result = registerSchema.safeParse({ ...validData, nickname: 'Bad Nickname!' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nickError = result.error.issues.find((i) => i.path.includes('nickname'))
      expect(nickError?.message).toBe('Solo letras minúsculas, números, guiones y guiones bajos')
    }
  })

  it('rejects nickname shorter than 3 characters', () => {
    const result = registerSchema.safeParse({ ...validData, nickname: 'ab' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nickError = result.error.issues.find((i) => i.path.includes('nickname'))
      expect(nickError?.message).toBe('El nickname debe tener al menos 3 caracteres')
    }
  })

  it('rejects name exceeding 100 characters', () => {
    const result = registerSchema.safeParse({ ...validData, name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede exceder 100 caracteres')
    }
  })

  it('rejects missing required fields with Spanish messages', () => {
    const result = registerSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('email')
      expect(paths).toContain('password')
      expect(paths).toContain('name')
      expect(paths).toContain('nickname')
      expect(paths).toContain('country')
      expect(paths).toContain('city')
      expect(paths).toContain('institution')
    }
  })
})

describe('updateProfileSchema', () => {
  const validData = {
    name: 'Test User',
    nickname: 'testuser',
    country: 'CO',
    city: 'Bogotá',
    institution: 'Universidad Nacional',
  }

  it('accepts valid profile data', () => {
    const result = updateProfileSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateProfileSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre es requerido')
    }
  })

  it('rejects institution exceeding 200 characters', () => {
    const result = updateProfileSchema.safeParse({ ...validData, institution: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const instError = result.error.issues.find((i) => i.path.includes('institution'))
      expect(instError?.message).toBe('La institución no puede exceder 200 caracteres')
    }
  })
})


describe('changePasswordSchema', () => {
  const validData = {
    currentPassword: 'oldpassword',
    newPassword: 'newpassword123',
    confirmNewPassword: 'newpassword123',
  }

  it('accepts valid change password data', () => {
    const result = changePasswordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects mismatched new passwords on confirmNewPassword path', () => {
    const result = changePasswordSchema.safeParse({ ...validData, confirmNewPassword: 'different123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find((i) => i.path.includes('confirmNewPassword'))
      expect(confirmError?.message).toBe('Las contraseñas no coinciden')
    }
  })

  it('rejects new password shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({ ...validData, newPassword: 'short', confirmNewPassword: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwError = result.error.issues.find((i) => i.path.includes('newPassword'))
      expect(pwError?.message).toBe('La nueva contraseña debe tener al menos 8 caracteres')
    }
  })

  it('rejects empty current password', () => {
    const result = changePasswordSchema.safeParse({ ...validData, currentPassword: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('currentPassword'))
      expect(error?.message).toBe('La contraseña actual es requerida')
    }
  })
})

describe('changeEmailSchema', () => {
  it('accepts valid change email data', () => {
    const result = changeEmailSchema.safeParse({
      newEmail: 'new@example.com',
      password: 'mypassword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = changeEmailSchema.safeParse({ newEmail: 'bad-email', password: 'mypassword' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path.includes('newEmail'))
      expect(emailError?.message).toBe('Correo electrónico inválido')
    }
  })

  it('rejects empty password with Spanish message', () => {
    const result = changeEmailSchema.safeParse({ newEmail: 'new@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwError = result.error.issues.find((i) => i.path.includes('password'))
      expect(pwError?.message).toBe('La contraseña es requerida para confirmar')
    }
  })
})

describe('recoverPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = recoverPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects empty email with Spanish message', () => {
    const result = recoverPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El correo es requerido')
    }
  })
})

describe('resetPasswordSchema', () => {
  const validData = {
    email: 'user@example.com',
    code: '123456',
    newPassword: 'newpassword123',
    confirmPassword: 'newpassword123',
  }

  it('accepts valid reset password data', () => {
    const result = resetPasswordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords on confirmPassword path', () => {
    const result = resetPasswordSchema.safeParse({ ...validData, confirmPassword: 'different123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find((i) => i.path.includes('confirmPassword'))
      expect(confirmError?.message).toBe('Las contraseñas no coinciden')
    }
  })

  it('rejects empty verification code', () => {
    const result = resetPasswordSchema.safeParse({ ...validData, code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const codeError = result.error.issues.find((i) => i.path.includes('code'))
      expect(codeError?.message).toBe('El código de verificación es requerido')
    }
  })
})

describe('adminUpdateUserSchema', () => {
  it('accepts valid admin update data', () => {
    const result = adminUpdateUserSchema.safeParse({ name: 'Admin User', role: 'ADMIN' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (all fields optional)', () => {
    const result = adminUpdateUserSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid role with Spanish message', () => {
    const result = adminUpdateUserSchema.safeParse({ role: 'INVALID_ROLE' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const roleError = result.error.issues.find((i) => i.path.includes('role'))
      expect(roleError?.message).toBe('Rol inválido')
    }
  })

  it('rejects name exceeding 100 characters', () => {
    const result = adminUpdateUserSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede exceder 100 caracteres')
    }
  })
})
