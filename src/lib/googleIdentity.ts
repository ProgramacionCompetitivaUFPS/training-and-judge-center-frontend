interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
}

interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: string | number
  locale?: string
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId
      }
    }
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

// Module-level cache shared across components
let scriptLoading: Promise<GoogleAccountsId> | null = null

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (scriptLoading) return scriptLoading

  scriptLoading = (async () => {
    if (!window.google?.accounts?.id) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`)
        if (existing) {
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')))
          return
        }
        const script = document.createElement('script')
        script.src = GOOGLE_SCRIPT_SRC
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
        document.head.appendChild(script)
      })
    }
    return window.google!.accounts.id
  })()

  return scriptLoading
}
