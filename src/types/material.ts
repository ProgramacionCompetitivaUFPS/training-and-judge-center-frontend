import type { PaginationParams } from './api'

// === Material Status ===

export type MaterialStatus = 'DRAFT' | 'PUBLISHED'

// === Material (API response) ===

export interface Material {
  id: string
  title: string
  content: string
  tags: string[]
  status: MaterialStatus
  pinned: boolean
  pinnedAt: string | null
  author: { nickname: string; name: string }
  group: { id: string; name: string }
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

// === List / Search Params ===

export interface MaterialListParams extends PaginationParams {
  pinned?: boolean
  tags?: string        // comma-separated, AND logic
  q?: string           // full-text search
  author?: string      // author nickname
  publishedFrom?: string // YYYY-MM-DD
  publishedTo?: string   // YYYY-MM-DD
  sort?: 'relevance' | 'publishedAt' | 'title'
  status?: MaterialStatus
}

export interface MaterialListResponse {
  materials: Material[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// === Create / Update ===

export interface CreateMaterialRequest {
  title: string
  content?: string
  tags?: string[]
}

export interface UpdateMaterialRequest {
  title?: string
  content?: string
  tags?: string[]
}
