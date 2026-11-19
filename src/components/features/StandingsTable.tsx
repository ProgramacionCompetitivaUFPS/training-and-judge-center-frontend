import { Link } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui'
import { BalloonIcon } from '@/components/features/BalloonIcon'
import { resolveBalloonColor } from '@/lib/balloon'
import { cn, formatContestTime, problemLabel } from '@/lib/utils'
import type { StandingEntry, StandingProblemResult, StandingsProblem } from '@/types/contest'

const HEAD_CELL =
  'sticky top-0 z-10 border-b border-neutral-border bg-neutral-background px-1 py-2 text-center text-xs font-semibold text-neutral-text-muted'
const BODY_CELL = 'border-b border-neutral-border px-1 py-[7px] text-center'
const FOOT_CELL = 'bg-slate-50 px-1 py-1 text-center text-xs'

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-700',
  2: 'text-slate-500',
  3: 'text-orange-700',
}

interface StandingsTableProps {
  problems: StandingsProblem[]
  entries: StandingEntry[]
}

function ProblemCell({ result }: { result: StandingProblemResult | undefined }) {
  if (!result || result.status === 'NOT_ATTEMPTED') {
    return <span aria-label="Sin intentos" className="text-slate-300">·</span>
  }
  if (result.status === 'ACCEPTED') {
    return (
      <>
        <span className="font-bold text-status-success">+{result.attempts > 1 ? result.attempts - 1 : ''}</span>
        {result.time !== null && (
          <span className="block font-mono text-[11px] font-medium text-neutral-text-muted">
            {formatContestTime(result.time)}
          </span>
        )}
      </>
    )
  }
  if (result.status === 'PENDING') {
    return <span className="font-bold text-status-warning">?</span>
  }
  return <span className="font-semibold text-status-error">-{result.attempts}</span>
}

function ParticipantCell({ entry }: { entry: StandingEntry }) {
  const { participant } = entry

  if (participant.type === 'TEAM') {
    return (
      <>
        <UsersRound className="mr-1.5 inline h-3.5 w-3.5 text-brand-primary" />
        {participant.displayName}
        <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[11px]">Equipo</Badge>
        {participant.members && participant.members.length > 0 && (
          <span className="ml-1.5 text-xs font-normal text-neutral-text-muted">
            {participant.members.join(', ')}
          </span>
        )}
      </>
    )
  }

  return (
    <>
      {participant.nickname ? (
        <Link to={`/users/${participant.nickname}`} className="hover:text-brand-primary">
          {participant.displayName}
        </Link>
      ) : (
        <span>{participant.displayName}</span>
      )}
      {participant.institution && (
        <span className="ml-1.5 text-xs font-normal text-neutral-text-muted">{participant.institution}</span>
      )}
    </>
  )
}

export function StandingsTable({ problems, entries }: StandingsTableProps) {
  const hasStats = problems.length > 0 && problems.every((p) => typeof p.accepted === 'number' && typeof p.tried === 'number')

  return (
    <div className="max-h-[calc(100vh-16rem)] overflow-auto border-t border-neutral-border">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className={cn(HEAD_CELL, 'w-11')}>#</th>
            <th scope="col" className={cn(HEAD_CELL, 'pl-3 text-left')}>Participante</th>
            <th scope="col" aria-label="Resueltos" title="Resueltos" className={cn(HEAD_CELL, 'w-11')}>=</th>
            <th scope="col" aria-label="Penalización" title="Penalización" className={cn(HEAD_CELL, 'w-14')}>Pen.</th>
            {problems.map((problem) => (
              <th key={problem.slug} scope="col" title={problem.title} className={HEAD_CELL}>
                <BalloonIcon
                  color={resolveBalloonColor(problem.color)}
                  letter={problemLabel(problem.position)}
                  className="mx-auto h-10 w-8"
                />
                <span className="sr-only">{problemLabel(problem.position)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.participant.id} className="hover:bg-neutral-background/60">
              <td className={cn(BODY_CELL, 'font-bold', RANK_COLORS[entry.rank] ?? 'text-neutral-text-muted')}>
                {entry.rank}
              </td>
              <td className={cn(BODY_CELL, 'pl-3 text-left font-semibold text-neutral-text-primary')}>
                <ParticipantCell entry={entry} />
              </td>
              <td className={cn(BODY_CELL, 'font-bold text-brand-primary')}>{entry.problemsSolved}</td>
              <td className={cn(BODY_CELL, 'text-xs text-neutral-text-muted')}>{entry.totalPenalty}</td>
              {problems.map((problem) => {
                const result = entry.problems.find((r) => r.position === problem.position)
                const firstSolve = result?.status === 'ACCEPTED' && result.isFirstSolve === true
                return (
                  <td
                    key={problem.slug}
                    data-first-solve={firstSolve ? 'true' : undefined}
                    className={cn(BODY_CELL, firstSolve && 'bg-emerald-50')}
                  >
                    <ProblemCell result={result} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        {hasStats && (
          <tfoot>
            <tr>
              <td className={FOOT_CELL} />
              <td className={cn(FOOT_CELL, 'pl-3 text-left text-neutral-text-muted')}>Aceptados</td>
              <td className={FOOT_CELL} />
              <td className={FOOT_CELL} />
              {problems.map((problem) => (
                <td key={problem.slug} className={cn(FOOT_CELL, 'font-semibold text-status-success')}>
                  {problem.accepted}
                </td>
              ))}
            </tr>
            <tr>
              <td className={FOOT_CELL} />
              <td className={cn(FOOT_CELL, 'pl-3 text-left text-neutral-text-muted')}>Intentos</td>
              <td className={FOOT_CELL} />
              <td className={FOOT_CELL} />
              {problems.map((problem) => (
                <td key={problem.slug} className={cn(FOOT_CELL, 'text-neutral-text-muted')}>
                  {problem.tried}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
