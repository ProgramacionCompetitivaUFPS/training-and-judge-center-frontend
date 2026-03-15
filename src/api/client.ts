const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token')
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
    const response = await fetch(this.buildUrl(path, config?.params), {
      headers: { ...this.getAuthHeaders(), ...config?.headers },
    })
    return this.handleResponse<T>(response)
  }

  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.buildUrl(path, config?.params), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async postFormData<T>(path: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.buildUrl(path, config?.params), {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), ...config?.headers },
      body: formData,
    })
    return this.handleResponse<T>(response)
  }

  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.buildUrl(path, config?.params), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async delete<T>(path: string, config?: RequestConfig & { body?: unknown }): Promise<T> {
    const headers: Record<string, string> = { ...this.getAuthHeaders(), ...config?.headers }
    if (config?.body) {
      headers['Content-Type'] = 'application/json'
    }
    const response = await fetch(this.buildUrl(path, config?.params), {
      method: 'DELETE',
      headers,
      body: config?.body ? JSON.stringify(config.body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.buildUrl(path, config?.params), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
