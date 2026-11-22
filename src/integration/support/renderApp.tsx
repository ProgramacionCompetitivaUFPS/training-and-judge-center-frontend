import { render } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { AppRoutes } from '@/AppRoutes'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ContestSessionProvider } from '@/components/layout/ContestSessionProvider'
import { ToastProvider } from '@/components/layout/ToastProvider'
import { createQueryClient } from '@/lib/queryClient'

export interface RenderAppOptions {
  /** URL the app starts on. */
  route?: string
}

/**
 * The real application tree (providers, router, route table, guards) with a fresh QueryClient per call.
 * Nothing is mocked: the only boundary is HTTP, answered by the handlers each test registers.
 * It is the same composition as App.tsx, with a MemoryRouter instead of the browser's.
 */
export function renderApp({ route = '/' }: RenderAppOptions = {}): { queryClient: QueryClient } {
  const queryClient = createQueryClient()
  // Same policy as production, except no retry: a failed request should fail the test now, not after a back-off
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } })

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <ContestSessionProvider>
              <AppRoutes />
            </ContestSessionProvider>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )

  return { queryClient }
}
