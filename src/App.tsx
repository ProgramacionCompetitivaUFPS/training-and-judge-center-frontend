import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/layout/ToastProvider'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ContestSessionProvider } from '@/components/layout/ContestSessionProvider'
import { AppLayout, ProtectedRoute } from '@/components/layout'
import { ROUTES } from '@/lib/constants'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { RecoverPasswordPage } from '@/pages/auth/RecoverPasswordPage'

// User pages
import { UserDashboardPage } from '@/pages/users/UserDashboardPage'
import { ProfilePage } from '@/pages/users/ProfilePage'
import { EditProfilePage } from '@/pages/users/EditProfilePage'

// Admin pages
import { UsersListPage } from '@/pages/admin/UsersListPage'

// Group pages
import { GroupsPage } from '@/pages/groups/GroupsPage'
import { GroupDetailPage } from '@/pages/groups/GroupDetailPage'
import { GroupFormPage } from '@/pages/groups/GroupFormPage'

// Existing pages (legacy, will be replaced)
import { ProblemsPage } from '@/pages/problems/ProblemsPage'
import { ProblemDetailPage } from '@/pages/problems/ProblemDetailPage'
import { ProblemFormPage } from '@/pages/problems/ProblemFormPage'
import { ProblemSubmissionsPage } from '@/pages/problems/ProblemSubmissionsPage'

// Submission pages
import { SubmissionsPage } from '@/pages/submissions/SubmissionsPage'
import { SubmissionDetailPage } from '@/pages/submissions/SubmissionDetailPage'
import { SubmitSolutionPage } from '@/pages/submissions/SubmitSolutionPage'

// Contest pages
import { ContestsPage } from '@/pages/contests/ContestsPage'
import { ContestDetailPage } from '@/pages/contests/ContestDetailPage'
import { ContestFormPage } from '@/pages/contests/ContestFormPage'
import { ContestStandingsPage } from '@/pages/contests/ContestStandingsPage'
import { ContestSubmissionsPage } from '@/pages/contests/ContestSubmissionsPage'

// Material pages
import { MaterialsPage } from '@/pages/materials/MaterialsPage'
import { MaterialDetailPage } from '@/pages/materials/MaterialDetailPage'
import { MaterialFormPage } from '@/pages/materials/MaterialFormPage'

// Team pages
import { TeamsPage } from '@/pages/teams/TeamsPage'
import { TeamDetailPage } from '@/pages/teams/TeamDetailPage'

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
          <AuthProvider>
            <ContestSessionProvider>
            <Routes>
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

              {/* Auth routes (public) */}
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
              <Route path={ROUTES.RECOVER_PASSWORD} element={<RecoverPasswordPage />} />

              {/* Dashboard */}
              <Route path={ROUTES.DASHBOARD} element={
                <ProtectedRoute><UserDashboardPage /></ProtectedRoute>
              } />

              {/* Profile */}
              <Route path={ROUTES.PROFILE} element={
                <ProtectedRoute><ProfilePage /></ProtectedRoute>
              } />
              <Route path={ROUTES.PROFILE_PUBLIC} element={
                <ProtectedRoute><ProfilePage /></ProtectedRoute>
              } />
              <Route path={ROUTES.SETTINGS} element={
                <ProtectedRoute><EditProfilePage /></ProtectedRoute>
              } />

              {/* Problems */}
              <Route path={ROUTES.PROBLEMS} element={
                <ProtectedRoute><ProblemsPage /></ProtectedRoute>
              } />
              <Route path={ROUTES.PROBLEM_NEW} element={
                <ProtectedRoute roles={['ADMIN', 'COACH']}><ProblemFormPage /></ProtectedRoute>
              } />
              <Route path={ROUTES.PROBLEM_DETAIL} element={
                <ProtectedRoute><ProblemDetailPage /></ProtectedRoute>
              } />
              <Route path={ROUTES.PROBLEM_EDIT} element={
                <ProtectedRoute roles={['ADMIN', 'COACH']}><ProblemFormPage /></ProtectedRoute>
              } />
              <Route path={ROUTES.PROBLEM_SUBMISSIONS} element={
                <ProtectedRoute><ProblemSubmissionsPage /></ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path={ROUTES.ADMIN_USERS} element={
                <ProtectedRoute roles={['ADMIN']}><UsersListPage /></ProtectedRoute>
              } />

              {/* Group routes */}
              <Route path={ROUTES.GROUPS} element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
              <Route path={ROUTES.GROUP_NEW} element={<ProtectedRoute roles={['ADMIN', 'COACH']}><GroupFormPage /></ProtectedRoute>} />
              <Route path={ROUTES.GROUP_DETAIL} element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
              <Route path={ROUTES.GROUP_EDIT} element={<ProtectedRoute roles={['ADMIN', 'COACH']}><GroupFormPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTESTS} element={<ProtectedRoute><ContestsPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTEST_NEW} element={<ProtectedRoute roles={['ADMIN', 'COACH']}><ContestFormPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTEST_DETAIL} element={<ProtectedRoute><ContestDetailPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTEST_EDIT} element={<ProtectedRoute roles={['ADMIN', 'COACH']}><ContestFormPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTEST_STANDINGS} element={<ProtectedRoute><ContestStandingsPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTEST_SUBMISSIONS} element={<ProtectedRoute><ContestSubmissionsPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTEST_PROBLEM} element={<ProtectedRoute><ProblemDetailPage /></ProtectedRoute>} />
              <Route path={ROUTES.SUBMIT_SOLUTION} element={<ProtectedRoute><SubmitSolutionPage /></ProtectedRoute>} />
              <Route path={ROUTES.CONTEST_SUBMIT} element={<ProtectedRoute><SubmitSolutionPage /></ProtectedRoute>} />
              <Route path={ROUTES.SUBMISSIONS} element={<ProtectedRoute><SubmissionsPage /></ProtectedRoute>} />
              <Route path={ROUTES.SUBMISSION_DETAIL} element={<ProtectedRoute><SubmissionDetailPage /></ProtectedRoute>} />
              <Route path={ROUTES.MATERIALS} element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>} />
              <Route path={ROUTES.MATERIAL_NEW} element={<ProtectedRoute roles={['ADMIN', 'COACH']}><MaterialFormPage /></ProtectedRoute>} />
              <Route path={ROUTES.MATERIAL_DETAIL} element={<ProtectedRoute><MaterialDetailPage /></ProtectedRoute>} />
              <Route path={ROUTES.MATERIAL_EDIT} element={<ProtectedRoute roles={['ADMIN', 'COACH']}><MaterialFormPage /></ProtectedRoute>} />
              <Route path={ROUTES.TEAMS} element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
              <Route path={ROUTES.TEAM_DETAIL} element={<ProtectedRoute><TeamDetailPage /></ProtectedRoute>} />

              {/* 404 */}
              <Route path="*" element={<PlaceholderPage title="Página no encontrada (404)" />} />
            </Routes>
            </ContestSessionProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
