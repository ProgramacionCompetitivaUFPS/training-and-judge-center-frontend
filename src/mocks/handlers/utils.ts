import { http, HttpResponse, delay, passthrough } from 'msw'

// MSW intercepta peticiones por URL exacta. Esta variable no es para hacer llamadas
// al backend — es para construir el patrón que MSW va a escuchar. Debe coincidir
// con la URL que el apiClient realmente llama (también lee VITE_API_URL).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export function url(path: string) {
  return `${API_URL}${path}`
}

type MockModule =
  | 'auth'
  | 'users'
  | 'dashboard'
  | 'groups'
  | 'problems'
  | 'submissions'
  | 'contests'
  | 'materials'
  | 'teams'

const MODULE_ENV_KEYS: Record<MockModule, string> = {
  auth:        'VITE_MOCK_AUTH',
  users:       'VITE_MOCK_USERS',
  dashboard:   'VITE_MOCK_DASHBOARD',
  groups:      'VITE_MOCK_GROUPS',
  problems:    'VITE_MOCK_PROBLEMS',
  submissions: 'VITE_MOCK_SUBMISSIONS',
  contests:    'VITE_MOCK_CONTESTS',
  materials:   'VITE_MOCK_MATERIALS',
  teams:       'VITE_MOCK_TEAMS',
}

export function isModuleMocked(module: MockModule): boolean {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') return true
  return import.meta.env[MODULE_ENV_KEYS[module]] === 'true'
}

export { http, HttpResponse, delay, passthrough }
