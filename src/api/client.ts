import { getAccessToken, setAccessToken, clearAccessToken, notifySessionExpired, isLoggingOut } from '@/lib/tokenStore'
import { ApiClientError } from '@/lib/errors'
import type { RefreshSessionResponse } from '@/types/user'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getAuthHeaders(): Record<string, string> {
    const token = getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value))
      })
    }
    return url.toString()
  }

  private ensureFreshToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  async refreshSession(): Promise<RefreshSessionResponse> {
    const response = await fetch(this.buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'UNKNOWN',
        message: response.statusText,
      }))
      throw new ApiClientError(response.status, error.error, error.message, error.details)
    }
    return response.json()
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const data = await this.refreshSession()
      setAccessToken(data.token)
      return true
    } catch {
      return false
    }
  }

  private async executeWithAuthRetry(doFetch: () => Promise<Response>, isRetry = false): Promise<Response> {
    const response = await doFetch()
    if (response.status !== 401 || isRetry) return response

    const body = await response.clone().json().catch(() => null)
    if (body?.error !== 'UNAUTHORIZED') return response

    if (isLoggingOut()) {
      clearAccessToken()
      return response
    }

    const refreshed = await this.ensureFreshToken()
    if (!refreshed) {
      clearAccessToken()
      notifySessionExpired()
      return response
    }

    return this.executeWithAuthRetry(doFetch, true)
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'UNKNOWN',
        message: response.statusText,
      }))
      throw new ApiClientError(response.status, error.error, error.message, error.details)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        credentials: 'include',
        headers: { ...this.getAuthHeaders(), ...config?.headers },
      })
    )
    return this.handleResponse<T>(response)
  }

  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...config?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    )
    return this.handleResponse<T>(response)
  }

  async postFormData<T>(path: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        method: 'POST',
        credentials: 'include',
        headers: { ...this.getAuthHeaders(), ...config?.headers },
        body: formData,
      })
    )
    return this.handleResponse<T>(response)
  }

  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...config?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    )
    return this.handleResponse<T>(response)
  }

  async delete<T>(path: string, config?: RequestConfig & { body?: unknown }): Promise<T> {
    const headers: Record<string, string> = { ...this.getAuthHeaders(), ...config?.headers }
    if (config?.body) {
      headers['Content-Type'] = 'application/json'
    }
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        method: 'DELETE',
        credentials: 'include',
        headers,
        body: config?.body ? JSON.stringify(config.body) : undefined,
      })
    )
    return this.handleResponse<T>(response)
  }

  async patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...config?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    )
    return this.handleResponse<T>(response)
  }

  async getBlob(path: string, config?: RequestConfig): Promise<Blob> {
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        credentials: 'include',
        headers: { ...this.getAuthHeaders(), ...config?.headers },
      })
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'UNKNOWN',
        message: response.statusText,
      }))
      throw new ApiClientError(response.status, error.error, error.message, error.details)
    }
    return response.blob()
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
