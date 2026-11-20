import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LateRegistrationConfirmDialog } from './LateRegistrationConfirmDialog'

describe('LateRegistrationConfirmDialog', () => {
  const user = userEvent.setup()

  it('avisa que no se podrá cancelar la inscripción', () => {
    render(
      <LateRegistrationConfirmDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )

    expect(screen.getByText(/no podrás cancelar la inscripción/i)).toBeInTheDocument()
  })

  it('llama onConfirm al pulsar Inscribirme', async () => {
    const onConfirm = vi.fn()
    render(
      <LateRegistrationConfirmDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />,
    )

    await user.click(screen.getByRole('button', { name: 'Inscribirme' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('llama onOpenChange(false) al pulsar Cancelar', async () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()
    render(
      <LateRegistrationConfirmDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('no renderiza el diálogo cuando open es false', () => {
    render(
      <LateRegistrationConfirmDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
