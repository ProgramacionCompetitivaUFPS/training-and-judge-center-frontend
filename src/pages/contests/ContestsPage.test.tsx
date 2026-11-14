import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { ContestsPage } from './ContestsPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-luisadmin', nickname: 'luisadmin', role: 'ADMIN' },
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: 'luisadmin',
    logout: vi.fn(),
  }),
}))

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ContestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestsPage', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('muestra las secciones "En curso", "Próximas" y "Finalizadas" en vista agrupada', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('En curso')).toBeInTheDocument()
    })
    expect(screen.getByText('Próximas')).toBeInTheDocument()
    expect(screen.getByText('Finalizadas')).toBeInTheDocument()
  })

  it('muestra el nombre de una competencia conocida en la sección activa', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Práctica Grafos')).toBeInTheDocument()
    })
  })

  it('muestra estado vacío "No hay competencias" cuando no hay resultados', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/contests', () =>
        HttpResponse.json({
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('No hay competencias')).toBeInTheDocument()
    })
  })
})
