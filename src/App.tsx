import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { AppLayout } from '@/components/layout'
import { ROUTES } from '@/lib/constants'

// Existing pages
import { DashboardPage } from '@/pages/DashboardPage'
import { ProblemsPage } from '@/pages/ProblemsPage'
import { ProblemDetailPage } from '@/pages/ProblemDetailPage'

// Placeholder pages — will be replaced in each phase
function PlaceholderPage({ title }: { title: string }) {
  return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-text-muted text-lg">{title} — Próximamente</p>
      </div>
    </AppLayout>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

            {/* Main app routes */}
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.PROBLEMS} element={<ProblemsPage />} />
            <Route path={ROUTES.PROBLEM_DETAIL} element={<ProblemDetailPage />} />

            {/* Placeholder routes — replaced in each phase */}
            <Route path={ROUTES.GROUPS} element={<PlaceholderPage title="Grupos" />} />
            <Route path={ROUTES.GROUP_DETAIL} element={<PlaceholderPage title="Detalle de Grupo" />} />
            <Route path={ROUTES.CONTESTS} element={<PlaceholderPage title="Competencias" />} />
            <Route path={ROUTES.CONTEST_DETAIL} element={<PlaceholderPage title="Detalle de Competencia" />} />
            <Route path={ROUTES.SUBMISSIONS} element={<PlaceholderPage title="Submissions" />} />
            <Route path={ROUTES.MATERIALS} element={<PlaceholderPage title="Materiales" />} />
            <Route path={ROUTES.TEAMS} element={<PlaceholderPage title="Equipos" />} />
            <Route path={ROUTES.PROFILE} element={<PlaceholderPage title="Mi Perfil" />} />
            <Route path={ROUTES.SETTINGS} element={<PlaceholderPage title="Configuración" />} />

            {/* Auth routes — replaced in Phase 1 */}
            <Route path={ROUTES.LOGIN} element={<PlaceholderPage title="Iniciar Sesión" />} />
            <Route path={ROUTES.REGISTER} element={<PlaceholderPage title="Registro" />} />
            <Route path={ROUTES.RECOVER_PASSWORD} element={<PlaceholderPage title="Recuperar Contraseña" />} />

            {/* Admin routes — replaced in Phase 1 */}
            <Route path={ROUTES.ADMIN_USERS} element={<PlaceholderPage title="Admin: Usuarios" />} />

            {/* 404 */}
            <Route path="*" element={<PlaceholderPage title="Página no encontrada (404)" />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
