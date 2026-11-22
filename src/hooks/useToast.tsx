import { useState, useCallback } from 'react'

export interface ToastMessage {
  id: string
  variant: 'default' | 'success' | 'error' | 'warning'
  title?: string
  description?: string
  duration?: number
}

/** State updater that drops one toast; a named function keeps the callbacks below shallow. */
const withoutToast = (id: string) => (toasts: ToastMessage[]) => toasts.filter((t) => t.id !== id)

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback(
    ({
      variant = 'default',
      title,
      description,
      duration = 5000,
    }: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastMessage = { id, variant, title, description, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => setToasts(withoutToast(id)), duration)
      }

      return id
    },
    []
  )

  const dismiss = useCallback((id: string) => {
    setToasts(withoutToast(id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    toast,
    dismiss,
    dismissAll,
  }
}
