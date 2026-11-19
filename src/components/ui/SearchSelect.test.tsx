import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SearchSelect } from '@/components/ui/SearchSelect'

type Item = { id: string; label: string }

interface WrapperProps {
  initialQuery?: string
  results?: Item[]
  isSearching?: boolean
  minChars?: number
  emptyLabel?: string
  hintLabel?: string
  onSelect?: (item: Item) => void
  disabled?: boolean
}

function Wrapper({
  initialQuery = '',
  results = [],
  isSearching = false,
  minChars,
  emptyLabel,
  hintLabel,
  onSelect = vi.fn(),
  disabled,
}: WrapperProps) {
  const [query, setQuery] = useState(initialQuery)
  return (
    <SearchSelect<Item>
      query={query}
      onQueryChange={setQuery}
      results={results}
      isSearching={isSearching}
      minChars={minChars}
      emptyLabel={emptyLabel}
      hintLabel={hintLabel}
      getKey={(item) => item.id}
      renderItem={(item) => item.label}
      onSelect={onSelect}
      disabled={disabled}
      placeholder="Buscar..."
    />
  )
}

describe('SearchSelect', () => {
  it('no muestra el dropdown cuando query tiene menos de minChars caracteres', async () => {
    const user = userEvent.setup()
    render(<Wrapper initialQuery="" />)
    await user.click(screen.getByPlaceholderText('Buscar...'))
    expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument()
  })

  it('muestra emptyLabel cuando query >= minChars y results está vacío', async () => {
    const user = userEvent.setup()
    render(<Wrapper initialQuery="ab" />)
    await user.click(screen.getByPlaceholderText('Buscar...'))
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  it('muestra emptyLabel personalizado', async () => {
    const user = userEvent.setup()
    render(<Wrapper initialQuery="ab" emptyLabel="No hay coincidencias" />)
    await user.click(screen.getByPlaceholderText('Buscar...'))
    expect(screen.getByText('No hay coincidencias')).toBeInTheDocument()
  })

  it('muestra spinner de Buscando... cuando isSearching es true', async () => {
    const user = userEvent.setup()
    render(<Wrapper initialQuery="ab" isSearching />)
    await user.click(screen.getByPlaceholderText('Buscar...'))
    expect(screen.getByText('Buscando...')).toBeInTheDocument()
  })

  it('renderiza los resultados en el dropdown', async () => {
    const user = userEvent.setup()
    const results: Item[] = [
      { id: '1', label: 'Resultado uno' },
      { id: '2', label: 'Resultado dos' },
    ]
    render(<Wrapper initialQuery="re" results={results} />)
    await user.click(screen.getByPlaceholderText('Buscar...'))
    expect(screen.getByText('Resultado uno')).toBeInTheDocument()
    expect(screen.getByText('Resultado dos')).toBeInTheDocument()
  })

  it('llama onSelect al hacer click en un resultado', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const results: Item[] = [{ id: '1', label: 'Elemento A' }]
    render(<Wrapper initialQuery="el" results={results} onSelect={onSelect} />)
    await user.click(screen.getByPlaceholderText('Buscar...'))
    await user.click(screen.getByRole('button', { name: 'Elemento A' }))
    expect(onSelect).toHaveBeenCalledWith(results[0])
  })

  it('deshabilita el campo de búsqueda cuando disabled es true', () => {
    render(<Wrapper disabled />)

    expect(screen.getByPlaceholderText('Buscar...')).toBeDisabled()
  })

  it('muestra hintLabel cuando query tiene más de 0 pero menos de minChars caracteres', async () => {
    const user = userEvent.setup()
    render(<Wrapper initialQuery="a" minChars={3} hintLabel="Escribe al menos 3 caracteres" />)
    await user.click(screen.getByPlaceholderText('Buscar...'))
    expect(screen.getByText('Escribe al menos 3 caracteres')).toBeInTheDocument()
  })
})
