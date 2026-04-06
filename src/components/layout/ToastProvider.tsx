import { createContext, useContext, ReactNode } from 'react'
import { useToast, ToastMessage } from '@/hooks/useToast'
import { Toast, ToastContainer, ToastTitle, ToastDescription } from '@/components/ui/Toast'

interface ToastContextType {
  toast: (props: Omit<ToastMessage, 'id'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, toast, dismiss, dismissAll } = useToast()

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}
      {toasts.length > 0 && (
        <ToastContainer position="top-right">
          {toasts.map((t) => (
            <Toast key={t.id} variant={t.variant} onClose={() => dismiss(t.id)}>
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              <ToastDescription>{t.description}</ToastDescription>
            </Toast>
          ))}
        </ToastContainer>
      )}
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider')
  }
  return context
}
