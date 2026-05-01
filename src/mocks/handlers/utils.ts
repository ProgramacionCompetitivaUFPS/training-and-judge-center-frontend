import { http, HttpResponse, delay } from 'msw'

// MSW intercepta peticiones por URL exacta. Esta variable no es para hacer llamadas
// al backend — es para construir el patrón que MSW va a escuchar. Debe coincidir
// con la URL que el apiClient realmente llama (también lee VITE_API_URL).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export function url(path: string) {
  return `${API_URL}${path}`
}

export { http, HttpResponse, delay }
