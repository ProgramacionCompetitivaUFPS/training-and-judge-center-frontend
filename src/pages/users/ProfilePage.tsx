import { useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { useUserProfile } from '@/hooks/api/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { User, MapPin, Building2, Calendar } from 'lucide-react'

export function ProfilePage() {
  const { nickname } = useParams<{ nickname: string }>()
  const { user: currentUser } = useAuth()

  const isOwnProfile = !nickname || nickname === currentUser?.nickname
  const targetNickname = nickname || currentUser?.nickname || ''

  const { data: profile, isLoading, error } = useUserProfile(targetNickname)

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-neutral-text-primary">
          {isOwnProfile ? 'Mi Perfil' : 'Perfil de Usuario'}
        </h1>

        {isLoading && (
          <Card className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </Card>
        )}

        {error && (
          <Alert variant="error">No se pudo cargar el perfil del usuario.</Alert>
        )}

        {profile && (
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-text-primary">{profile.name}</h2>
                <p className="text-neutral-text-muted">@{profile.nickname}</p>
              </div>
              <Badge variant={profile.role === 'ADMIN' ? 'default' : profile.role === 'COACH' ? 'primary' : 'outline'}>
                {profile.role}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-neutral-text-muted">
                <Building2 className="h-4 w-4" />
                <span>{profile.institution}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-text-muted">
                <Calendar className="h-4 w-4" />
                <span>Miembro desde {new Date(profile.createdAt).toLocaleDateString('es')}</span>
              </div>
            </div>

            {isOwnProfile && currentUser && (
              <div className="border-t border-neutral-border pt-4 space-y-3">
                <h3 className="text-sm font-medium text-neutral-text-primary flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información privada
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-neutral-text-muted">
                  <div>
                    <span className="font-medium text-neutral-text-primary">Email:</span>{' '}
                    {currentUser.email}
                  </div>
                  <div>
                    <span className="font-medium text-neutral-text-primary">País:</span>{' '}
                    {currentUser.country}
                  </div>
                  <div>
                    <span className="font-medium text-neutral-text-primary">Ciudad:</span>{' '}
                    {currentUser.city}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {currentUser.city}, {currentUser.country}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
