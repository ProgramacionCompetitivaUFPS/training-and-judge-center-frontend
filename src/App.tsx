import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/layout/ToastProvider'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ContestSessionProvider } from '@/components/layout/ContestSessionProvider'
import { createQueryClient } from '@/lib/queryClient'
import { AppRoutes } from '@/AppRoutes'

export default function App() {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <ContestSessionProvider>
              <AppRoutes />
            </ContestSessionProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
