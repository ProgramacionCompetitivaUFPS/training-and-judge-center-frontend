type Listener = () => void

let accessToken: string | null = null
const listeners = new Set<Listener>()

const logoutChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('auth-logout') : null
logoutChannel?.addEventListener('message', (event) => {
  if (event.data === 'logout') {
    accessToken = null
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

export function subscribeSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}
