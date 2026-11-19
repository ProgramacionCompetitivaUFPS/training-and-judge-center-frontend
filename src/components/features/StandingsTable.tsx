import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui'
import { BalloonIcon } from '@/components/features/BalloonIcon'
import { resolveBalloonColor } from '@/lib/balloon'
import { cn, formatContestTime, problemLabel } from '@/lib/utils'
import type { StandingEntry, StandingProblemResult, StandingsPhase, StandingsProblem } from '@/types/contest'

const HEAD_CELL =
  'border-b border-neutral-border px-1 py-2 text-center text-sm font-semibold text-neutral-text-muted'
const BODY_CELL = 'border-b border-neutral-border px-1 py-[7px] text-center'
const FOOT_CELL = 'bg-slate-50 px-1 py-1.5 text-center text-sm'

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-700',
  2: 'text-slate-500',
  3: 'text-orange-700',
}

interface StandingsTableProps {
  problems: StandingsProblem[]
  entries: StandingEntry[]
  /** Fase pedida: define de qué filas son los contadores del pie (con `all`, solo las oficiales). */
  phase?: StandingsPhase
}

const STATS_SCOPE_LABEL: Partial<Record<StandingsPhase, string>> = {
  all: ' (oficial)',
  postcompetition: ' (post-competencia)',
}

/** Filas de post-competencia: `isOfficial` false (ausente = oficial). */
function isPost(entry: StandingEntry): boolean {
  return entry.isOfficial === false
}

function ProblemCell({ result, post }: { result: StandingProblemResult | undefined; post: boolean }) {
  if (!result || result.status === 'NOT_ATTEMPTED') {
    return <span aria-label="Sin intentos" className="text-slate-300">·</span>
  }
  if (result.status === 'ACCEPTED') {
    return (
      <>
        <span className={cn('font-bold', post ? 'text-brand-accent' : 'text-status-success')}>
          +{result.attempts > 1 ? result.attempts - 1 : ''}
        </span>
        {!post && result.time !== null && (
          <span className="block font-mono text-xs font-medium text-neutral-text-muted">
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
    const members = participant.members?.join(', ')
    return (
      <div className="flex max-w-72 items-center whitespace-nowrap">
        <UsersRound className="mr-1.5 inline h-3.5 w-3.5 shrink-0 text-brand-primary" />
        {participant.displayName}
        <Badge variant="outline" className="ml-1.5 shrink-0 px-1.5 py-0 text-xs">Equipo</Badge>
        {members && (
          <span title={members} className="ml-1.5 min-w-0 truncate text-sm font-normal text-neutral-text-muted">
            {members}
          </span>
        )}
      </div>
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
        <span className="ml-1.5 text-sm font-normal text-neutral-text-muted">{participant.institution}</span>
      )}
    </>
  )
}

export function StandingsTable({ problems, entries, phase }: StandingsTableProps) {
  const statsScope = phase ? (STATS_SCOPE_LABEL[phase] ?? '') : ''
  const hasStats = problems.length > 0 && problems.every((p) => typeof p.accepted === 'number' && typeof p.tried === 'number')

  return (
    <div className="overflow-x-auto border-t border-neutral-border">
      <table className="w-full border-separate border-spacing-0 text-base">
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
          {entries.map((entry, index) => {
            const post = isPost(entry)
            const showStrip = post && (index === 0 || !isPost(entries[index - 1]))
            return (
              <Fragment key={`${entry.participant.id}-${post ? 'post' : 'official'}`}>
                {showStrip && (
                  <tr>
                    <td
                      colSpan={4 + problems.length}
                      className="bg-brand-accent-muted px-3 py-1 text-left text-xs font-semibold text-brand-accent-dark"
                    >
                      Post-competencia
                    </td>
                  </tr>
                )}
                <tr className="hover:bg-neutral-background/60">
                  <td className={cn(BODY_CELL, 'font-bold', !post && (RANK_COLORS[entry.rank ?? 0] ?? 'text-neutral-text-muted'))}>
                    {!post && entry.rank}
                  </td>
                  <td
                    className={cn(
                      BODY_CELL,
                      'pl-3 text-left',
                      post ? 'font-medium text-neutral-text-muted' : 'font-semibold text-neutral-text-primary',
                    )}
                  >
                    {post ? `* ${entry.participant.displayName}` : <ParticipantCell entry={entry} />}
                  </td>
                  <td className={cn(BODY_CELL, 'font-bold', post ? 'text-neutral-text-muted' : 'text-brand-primary')}>
                    {entry.problemsSolved}
                  </td>
                  <td className={cn(BODY_CELL, 'text-sm text-neutral-text-muted')}>{post ? '—' : entry.totalPenalty}</td>
                  {problems.map((problem) => {
                    const result = entry.problems.find((r) => r.position === problem.position)
                    const firstSolve = !post && result?.status === 'ACCEPTED' && result.isFirstSolve === true
                    return (
                      <td
                        key={problem.slug}
                        data-first-solve={firstSolve ? 'true' : undefined}
                        className={cn(BODY_CELL, firstSolve && 'bg-emerald-100')}
                      >
                        <ProblemCell result={result} post={post} />
                      </td>
                    )
                  })}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
        {hasStats && (
          <tfoot>
            <tr>
              <td className={FOOT_CELL} />
              <td className={cn(FOOT_CELL, 'pl-3 text-left text-neutral-text-muted')}>{`Aceptados${statsScope}`}</td>
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
              <td className={cn(FOOT_CELL, 'pl-3 text-left text-neutral-text-muted')}>{`Intentos${statsScope}`}</td>
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
