export function usePaginationRange(currentPage: number, totalPages: number, windowSize = 5): number[] {
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2))
  const end = Math.min(totalPages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
