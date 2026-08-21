import { useParams, useNavigate, Link } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useGroupDetail, useAcceptInvitation } from '@/hooks/api/useGroups'
import { useToastContext } from '@/hooks/useToastContext'
import { PATHS, ROUTES } from '@/lib/constants'

export function AcceptInvitationPage() {
  const { groupId, invitationId } = useParams<{ groupId: string; invitationId: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()

  const { data: group, isLoading } = useGroupDetail(groupId!)
  const acceptMutation = useAcceptInvitation()

  if (!groupId || !invitationId) return null

  const handleAccept = () => {
    acceptMutation.mutate(
      { groupId, invitationId },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Te has unido al grupo' })
          navigate(PATHS.group(groupId))
        },
        onError: () => {
          toast({ variant: 'error', title: 'Error al aceptar la invitación', description: 'El enlace pudo haber expirado, ya fue usado, o no está dirigido a tu cuenta.' })
        },
      },
    )
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Grupos', href: ROUTES.GROUPS }, { label: 'Aceptar invitación' }]}>
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitación a grupo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-6 w-2/3" />
            ) : !group ? (
              <p className="text-status-error text-sm">No se pudo encontrar el grupo de esta invitación.</p>
            ) : (
              <>
                <p className="text-neutral-text-muted">
                  Has sido invitado a unirte al grupo{' '}
                  <Link to={PATHS.group(groupId)} className="font-semibold text-brand-primary hover:underline">
                    {group.name}
                  </Link>
                  .
                </p>
                <Button onClick={handleAccept} isLoading={acceptMutation.isPending} className="w-full">
                  Aceptar invitación
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
