import { createContext, ReactNode } from 'react'
import { useToast, ToastMessage } from '@/hooks/useToast'
import { Toast, ToastContainer, ToastTitle, ToastDescription } from '@/components/ui/Toast'

interface ToastContextType {
  toast: (props: Omit<ToastMessage, 'id'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)
export { ToastContext }

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
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
