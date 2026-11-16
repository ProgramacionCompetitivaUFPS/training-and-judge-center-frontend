import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from '@/components/ui/PasswordInput'

describe('PasswordInput', () => {
  it('renderiza el campo como type="password" por defecto', () => {
    render(<PasswordInput label="Contraseña" />)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('muestra el label cuando se pasa la prop label', () => {
    render(<PasswordInput label="Contraseña" />)
    expect(screen.getByText('Contraseña')).toBeInTheDocument()
  })

  it('cambia a type="text" al hacer click en el botón de mostrar contraseña', async () => {
    const user = userEvent.setup()
    render(<PasswordInput label="Contraseña" />)
    const input = screen.getByLabelText('Contraseña')
    await user.click(screen.getByLabelText('Mostrar contraseña'))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('vuelve a type="password" al hacer click de nuevo', async () => {
    const user = userEvent.setup()
    render(<PasswordInput label="Contraseña" />)
    const input = screen.getByLabelText('Contraseña')
    await user.click(screen.getByLabelText('Mostrar contraseña'))
    expect(screen.getByLabelText('Ocultar contraseña')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Ocultar contraseña'))
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Mostrar contraseña')).toBeInTheDocument()
  })

  it('muestra el nivel de fortaleza visible cuando showStrength es true', () => {
    render(<PasswordInput showStrength strengthValue="Password1!" />)
    expect(screen.getByText(/Fuerte|Media|Débil/i)).toBeInTheDocument()
  })

  it('muestra el mensaje de error cuando se pasa error prop', () => {
    render(<PasswordInput error="Campo requerido" />)
    expect(screen.getByText('Campo requerido')).toBeInTheDocument()
  })

  it('muestra helperText cuando no hay error', () => {
    render(<PasswordInput helperText="Mínimo 8 caracteres" />)
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument()
  })

  it('NO muestra helperText cuando hay error (el error toma prioridad)', () => {
    render(<PasswordInput error="Error" helperText="Ayuda" />)
    expect(screen.queryByText('Ayuda')).not.toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })
})
