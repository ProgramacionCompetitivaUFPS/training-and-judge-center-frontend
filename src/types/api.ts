export interface ApiError {
  error: string
  message: string
  details?: Array<{
    field: string
    message: string
  }>
}

export interface PaginationParams {
  page?: number
  limit?: number
}
