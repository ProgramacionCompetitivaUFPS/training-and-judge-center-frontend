import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, ServerCrash } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui'
import { ROUTES } from '@/lib/constants'

interface ErrorPageProps {
  message?: string
}

export function ErrorPage({ message }: ErrorPageProps) {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <ServerCrash className="h-16 w-16 text-brand-primary mb-4" />
        <h1 className="text-2xl font-bold text-neutral-text-primary">Algo salió mal</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-text-muted">
          {message ?? 'No se pudo cargar la página. Intenta de nuevo o vuelve al inicio.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD)}>
            <Home className="h-4 w-4 mr-2" />
            Ir al inicio
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
