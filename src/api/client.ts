import { getAccessToken, setAccessToken, clearAccessToken, notifySessionExpired, isLoggingOut } from '@/lib/tokenStore'
import { ApiClientError } from '@/lib/errors'
import type { RefreshSessionResponse } from '@/types/user'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

interface ErrorBody {
  error?: string
  message?: string
  details?: Array<{ field: string; code?: string; message: string }>
}

type UploadUnauthorizedOutcome =
  | { action: 'retry' }
  | { action: 'reject'; body: ErrorBody }
  | { action: 'continue' }

/** The JSON object of an error answer; anything else ("null", a string, not JSON) has no fields. */
function parseErrorBody(text: string): ErrorBody {
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? (parsed as ErrorBody) : {}
  } catch {
    return {}
  }
}

function uploadHttpError(status: number, statusText: string, responseText: string): ApiClientError {
  const body = parseErrorBody(responseText)
  return new ApiClientError(status, body.error ?? 'UNKNOWN', body.message ?? statusText, body.details, body)
}

class ApiClient {
  private baseUrl: string
  private refreshPromise: Promise<'ok' | 'definitive' | 'transient'> | null = null

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

  private ensureFreshToken(): Promise<'ok' | 'definitive' | 'transient'> {
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
      throw new ApiClientError(response.status, error.error, error.message, error.details, error)
    }
    return response.json()
  }

  private async performRefresh(): Promise<'ok' | 'definitive' | 'transient'> {
    try {
      const data = await this.refreshSession()
      setAccessToken(data.token)
      return 'ok'
    } catch (err) {
      const definitive = err instanceof ApiClientError && err.status < 500
      return definitive ? 'definitive' : 'transient'
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

    const refreshResult = await this.ensureFreshToken()
    if (refreshResult !== 'ok') {
      clearAccessToken()
      if (refreshResult === 'definitive') notifySessionExpired()
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
      throw new ApiClientError(response.status, error.error, error.message, error.details, error)
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

  /**
   * What to do with a 401 answered to an upload: retry with a refreshed token, reject because the
   * session is gone, or `continue` and treat it like any other error (it is not an expired token).
   */
  private async resolveUploadUnauthorized(responseText: string): Promise<UploadUnauthorizedOutcome> {
    const body = parseErrorBody(responseText)
    if (body.error !== 'UNAUTHORIZED') return { action: 'continue' }

    if (isLoggingOut()) {
      clearAccessToken()
      return { action: 'reject', body }
    }
    const refreshResult = await this.ensureFreshToken()
    if (refreshResult === 'ok') return { action: 'retry' }

    clearAccessToken()
    if (refreshResult === 'definitive') notifySessionExpired()
    return { action: 'reject', body }
  }

  postFormDataWithProgress<T>(
    path: string,
    formData: FormData,
    onProgress?: (pct: number) => void,
    config?: RequestConfig,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const attempt = (isRetry: boolean) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', this.buildUrl(path, config?.params))
        xhr.withCredentials = true
        xhr.timeout = 5 * 60 * 1000

        // Same precedence as the fetch-based methods: config.headers wins over the defaults.
        // setRequestHeader appends instead of replacing, so a custom Authorization skips the token one.
        const extraHeaders = config?.headers ?? {}
        const hasCustomAuth = Object.keys(extraHeaders).some((name) => name.toLowerCase() === 'authorization')
        const token = getAccessToken()
        if (token && !hasCustomAuth) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        for (const [name, value] of Object.entries(extraHeaders)) xhr.setRequestHeader(name, value)

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = async () => {
          if (xhr.status === 401 && !isRetry) {
            const outcome = await this.resolveUploadUnauthorized(xhr.responseText)
            if (outcome.action === 'retry') {
              attempt(true)
              return
            }
            if (outcome.action === 'reject') {
              reject(new ApiClientError(401, 'UNAUTHORIZED', 'Unauthorized', undefined, outcome.body))
              return
            }
          }

          if (xhr.status >= 400) {
            reject(uploadHttpError(xhr.status, xhr.statusText, xhr.responseText))
            return
          }

          if (xhr.status === 204) {
            resolve(undefined as T)
            return
          }

          try {
            resolve(JSON.parse(xhr.responseText) as T)
          } catch {
            reject(new ApiClientError(xhr.status, 'UNKNOWN', 'Failed to parse response', undefined, undefined))
          }
        }

        xhr.onerror = () => {
          reject(new ApiClientError(0, 'NETWORK_ERROR', 'Network request failed', undefined, undefined))
        }

        xhr.ontimeout = () => {
          reject(new ApiClientError(0, 'TIMEOUT', 'Request timed out', undefined, undefined))
        }

        xhr.send(formData)
      }

      attempt(false)
    })
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
    const response = await this.executeWithAuthRetry(() =>
      fetch(this.buildUrl(path, config?.params), {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...this.getAuthHeaders(),
          ...(config?.body ? { 'Content-Type': 'application/json' } : {}),
          ...config?.headers,
        },
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
      throw new ApiClientError(response.status, error.error, error.message, error.details, error)
    }
    return response.blob()
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
