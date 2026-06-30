import { useNavigate } from 'react-router-dom'
import { Users, BarChart3, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatDateTz, formatDuration, participationModeLabel } from '@/lib/utils'
import { PATHS } from '@/lib/constants'
import type { ContestDetail } from '@/types/contest'

interface ContestInfoSidebarProps {
  contest: ContestDetail
}

export function ContestInfoSidebar({ contest }: ContestInfoSidebarProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wider">Información</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-text-muted">Modalidad</span>
          <span className="text-sm font-semibold">{participationModeLabel(contest.participationMode)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-text-muted">Participantes</span>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-neutral-text-muted" />
            <span className="text-sm font-semibold">{contest.participantCount}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-text-muted">Penalización</span>
          <span className="text-sm font-semibold text-brand-primary">{contest.penalty} min / error</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-text-muted">Duración</span>
          <span className="text-sm font-semibold">{formatDuration(contest.duration)}</span>
        </div>
        {contest.freezeMinutes != null && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-text-muted">Freeze</span>
            <span className="text-sm font-semibold">{contest.freezeMinutes} min</span>
          </div>
        )}
        <div className="border-t border-neutral-border my-2" />
        <div>
          <p className="text-[10px] font-semibold text-neutral-text-muted uppercase tracking-widest mb-1">Inicio</p>
          <p className="text-sm font-semibold">{formatDateTz(contest.startTime)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-neutral-text-muted uppercase tracking-widest mb-1">Fin</p>
          <p className="text-sm font-semibold">{formatDateTz(contest.endTime)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContestQuickLinksProps {
  groupId: string
  contestId: string
}

export function ContestQuickLinks({ groupId, contestId }: ContestQuickLinksProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Recursos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate(PATHS.contestStandings(groupId, contestId))}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-neutral-background hover:bg-neutral-border/50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Ranking</span>
          </button>
          <button
            onClick={() => navigate(PATHS.contestSubmissions(groupId, contestId))}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-neutral-background hover:bg-neutral-border/50 transition-colors"
          >
            <FileText className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Envíos</span>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContestOrganizerCardProps {
  groupName: string
  ownerNickname: string
}

export function ContestOrganizerCard({ groupName, ownerNickname }: ContestOrganizerCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Organizado por</p>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="text-neutral-text-muted">Grupo: </span>
            <span className="font-semibold text-neutral-text-primary">{groupName}</span>
          </p>
          <p className="text-sm">
            <span className="text-neutral-text-muted">Organizador: </span>
            <span className="font-semibold text-neutral-text-primary">@{ownerNickname}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContestAdminActionsProps {
  contestId: string
  groupId: string
  onDelete: () => void
  isDeleting?: boolean
}

export function ContestAdminActions({ contestId, groupId, onDelete, isDeleting }: ContestAdminActionsProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardContent className="pt-5 space-y-2">
        <Button variant="outline" className="w-full" onClick={() => navigate(PATHS.contestEdit(groupId, contestId))}>
          Editar contest
        </Button>
        <Button variant="danger" className="w-full" onClick={onDelete} isLoading={isDeleting}>
          Eliminar contest
        </Button>
      </CardContent>
    </Card>
  )
}
