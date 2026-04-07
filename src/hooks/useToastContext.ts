import { useContext } from 'react'
import { ToastContext } from '@/components/layout/ToastProvider'

export function useToastContext() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider')
  }
  return context
}
