import { useEffect, useRef, useState } from 'react'
import { loadGoogleIdentity } from '@/lib/googleIdentity'

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function GoogleSignInButton({ onCredential, text = 'continue_with' }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(!GOOGLE_CLIENT_ID)

  const onCredentialRef = useRef(onCredential)
  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    let cancelled = false

    loadGoogleIdentity()
      .then((accountsId) => {
        if (cancelled || !containerRef.current) return
        accountsId.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        })
        containerRef.current.innerHTML = ''
        accountsId.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          width: 320,
        })
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [text])

  if (loadError) return null

  return <div ref={containerRef} className="flex justify-center" />
}
