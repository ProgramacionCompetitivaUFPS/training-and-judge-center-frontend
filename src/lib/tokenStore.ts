type Listener = () => void

let accessToken: string | null = null
const listeners = new Set<Listener>()

const logoutChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('auth-logout') : null
logoutChannel?.addEventListener('message', (event) => {
  if (event.data === 'logout') {
    accessToken = null
    clearSessionMark()
    listeners.forEach((listener) => listener())
  }
})

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  if (token) sessionExpiredNotified = false
  listeners.forEach((listener) => listener())
}

export function clearAccessToken(): void {
  setAccessToken(null)
}

let loggingOut = false

export function setLoggingOut(value: boolean): void {
  loggingOut = value
}

export function isLoggingOut(): boolean {
  return loggingOut
}

export function notifyLogout(): void {
  logoutChannel?.postMessage('logout')
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const sessionExpiredListeners = new Set<Listener>()
let sessionExpiredNotified = false

export function notifySessionExpired(): void {
  if (sessionExpiredNotified) return
  sessionExpiredNotified = true
  sessionExpiredListeners.forEach((listener) => listener())
}

export function resetSessionExpiredNotified(): void {
  sessionExpiredNotified = false
}

export function subscribeSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

const SESSION_MARK_KEY = 'auth_session_active'

export function markSessionActive(): void {
  try { localStorage.setItem(SESSION_MARK_KEY, '1') } catch {}
}

export function clearSessionMark(): void {
  try { localStorage.removeItem(SESSION_MARK_KEY) } catch {}
}

export function hasSessionMark(): boolean {
  try { return localStorage.getItem(SESSION_MARK_KEY) === '1' } catch { return false }
}
