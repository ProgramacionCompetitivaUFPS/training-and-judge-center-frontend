import { describe, it, expect } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { renderWithProviders, screen, waitFor, server } from '@/test/test-utils'
import { ProblemsPage } from './ProblemsPage'

const API_URL = 'http://localhost:8080/api'

describe('ProblemsPage — loading states', () => {
  describe('skeleton placeholders during data fetching', () => {
    it('shows skeleton placeholders while data is loading', async () => {
      // Override the problems handler with a long delay to keep loading state visible
      server.use(
        http.get(`${API_URL}/problems`, async () => {
          await delay(5000)
          return HttpResponse.json({
            problems: [],
            pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
          })
        }),
      )

      renderWithProviders(<ProblemsPage />, { role: 'ADMIN' })

      // Skeleton placeholders should be visible immediately during loading
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('replaces skeletons with content when data arrives', async () => {
      // Use default handler (has 300ms delay) — data will arrive quickly
      localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')

      renderWithProviders(<ProblemsPage />, { role: 'ADMIN' })

      // Initially skeletons should be visible
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

      // Wait for data to load — "Two Sum" is a known problem from mock data
      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
      })

      // After data loads, skeletons should be gone
      // The Skeleton components use the specific class pattern from ProblemsPage: "h-14 w-full rounded-lg"
      const remainingSkeletons = document.querySelectorAll('.animate-pulse')
      // There should be no skeleton loading placeholders left in the main content area
      // (Note: some animate-pulse may exist in other UI elements, so we check the specific skeleton pattern)
      const loadingSkeletons = screen.queryAllByRole('generic').filter(
        (el) => el.classList.contains('animate-pulse') && el.classList.contains('rounded-lg'),
      )
      expect(loadingSkeletons.length).toBe(0)
    })
  })

  describe('EntityListPage pattern loading state', () => {
    it('renders default loading skeletons when isLoading is true', async () => {
      // Import EntityListPage directly to test the pattern component
      const { EntityListPage } = await import('@/components/patterns/EntityListPage')

      renderWithProviders(
        <EntityListPage
          title="Test List"
          items={[]}
          isLoading={true}
          renderItem={() => <div>item</div>}
        />,
        { role: 'ADMIN' },
      )

      // The default loading renders 3 cards with animate-pulse divs
      const pulseElements = document.querySelectorAll('.animate-pulse')
      expect(pulseElements.length).toBeGreaterThan(0)

      // Title should still be visible during loading
      expect(screen.getByText('Test List')).toBeInTheDocument()
    })

    it('renders items instead of skeletons when isLoading is false', async () => {
      const { EntityListPage } = await import('@/components/patterns/EntityListPage')

      const items = [
        { id: '1', name: 'Item One' },
        { id: '2', name: 'Item Two' },
      ]

      renderWithProviders(
        <EntityListPage
          title="Test List"
          items={items}
          isLoading={false}
          renderItem={(item) => <div key={item.id}>{item.name}</div>}
        />,
        { role: 'ADMIN' },
      )

      // Items should be rendered
      expect(screen.getByText('Item One')).toBeInTheDocument()
      expect(screen.getByText('Item Two')).toBeInTheDocument()

      // No loading skeletons should be present (check for the specific loading pattern)
      const loadingCards = document.querySelectorAll('.animate-pulse .bg-neutral-border')
      expect(loadingCards.length).toBe(0)
    })

    it('uses custom renderLoading when provided', async () => {
      const { EntityListPage } = await import('@/components/patterns/EntityListPage')

      renderWithProviders(
        <EntityListPage
          title="Test List"
          items={[]}
          isLoading={true}
          renderItem={() => <div>item</div>}
          renderLoading={() => <div data-testid="custom-loading">Loading custom...</div>}
        />,
        { role: 'ADMIN' },
      )

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading custom...')).toBeInTheDocument()
    })
  })
})
