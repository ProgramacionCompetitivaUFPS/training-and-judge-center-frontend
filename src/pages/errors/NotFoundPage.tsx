import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui'
import { ROUTES } from '@/lib/constants'

/**
 * Shown for unknown routes and for resources the API answers with 404 or 403.
 * Both cases look the same on purpose: telling "forbidden" apart from "missing"
 * would confirm that a resource the user can't access exists.
 */
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <p className="text-7xl font-extrabold text-brand-primary tracking-tight">404</p>
        <h1 className="mt-4 text-2xl font-bold text-neutral-text-primary">Página no encontrada</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-text-muted">
          La página que buscas no existe o no está disponible para tu cuenta.
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
