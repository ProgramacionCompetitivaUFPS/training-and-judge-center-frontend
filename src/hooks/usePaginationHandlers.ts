import type { Dispatch, SetStateAction } from 'react'

export function usePaginationHandlers<T extends { page?: number; limit?: number }>(
  setState: Dispatch<SetStateAction<T>>
) {
  const handlePageChange = (page: number) => setState((prev) => ({ ...prev, page }))
  const handleLimitChange = (limit: number) => setState((prev) => ({ ...prev, limit, page: 1 }))
  return { handlePageChange, handleLimitChange }
}
