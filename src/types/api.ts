export interface ApiError {
  error: string
  message: string
  details?: Array<{
    field: string
    message: string
  }>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    totalCount: number
    currentPage: number
    totalPages: number
    itemsPerPage: number
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
}
