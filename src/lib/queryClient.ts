import { QueryClient } from '@tanstack/react-query'
import { isClientError } from '@/lib/errors'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        // A 4xx (not found, forbidden, invalid) won't change on a second try.
        retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}
