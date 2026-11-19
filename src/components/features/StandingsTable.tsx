import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui'
import { BalloonIcon } from '@/components/features/BalloonIcon'
import { resolveBalloonColor } from '@/lib/balloon'
import { cn, formatContestTime, pluralize, problemLabel } from '@/lib/utils'
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
  /** Fase pedida: define qué contadores se muestran en el pie. */
  phase?: StandingsPhase
}

type Counter = 'accepted' | 'tried'

/** Todos los problemas traen los contadores de post-competencia (backend nuevo). */
function hasPostCounters(problems: StandingsProblem[]): boolean {
  return problems.every((p) => typeof p.postAccepted === 'number' && typeof p.postTried === 'number')
}

/**
 * Contador del pie de un problema. `main` es el número principal y `extra` los de post-competencia que
 * se suman aparte (solo con la fase `all`, para no mezclar con los oficiales). Con `postcompetition` se leen
 * `postAccepted`/`postTried` si el backend los manda; si no, `accepted`/`tried`, que ahí valen lo mismo.
 */
function footerCounter(
  problem: StandingsProblem,
  kind: Counter,
  phase: StandingsPhase | undefined,
  postCounters: boolean,
): { main: number; extra: number } {
  const official = problem[kind] ?? 0
  const post = (kind === 'accepted' ? problem.postAccepted : problem.postTried) ?? 0
  if (phase === 'postcompetition' && postCounters) return { main: post, extra: 0 }
  return { main: official, extra: phase === 'all' && postCounters ? post : 0 }
}

/** Sufijo que aclara de qué filas son los contadores cuando no se ven los dos juegos a la vez. */
function footerScopeLabel(phase: StandingsPhase | undefined, postCounters: boolean): string {
  if (phase === 'postcompetition') return ' (post-competencia)'
  if (phase === 'all' && !postCounters) return ' (oficial)'
  return ''
}

function FooterCounterCell({ counter, className }: { counter: { main: number; extra: number }; className: string }) {
  const title = counter.extra > 0 ? `${counter.main} oficiales + ${counter.extra} de post-competencia` : undefined
  return (
    <td title={title} className={cn(FOOT_CELL, className)}>
      {counter.main}
      {counter.extra > 0 && <span className="font-normal text-brand-accent"> (+{counter.extra})</span>}
    </td>
  )
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
    const pending = result.pending ?? 0
    return (
      <>
        <span aria-hidden="true" className="font-bold text-neutral-text-muted">?</span>
        {pending > 0 && (
          <span aria-hidden="true" className="block text-xs font-medium text-neutral-text-muted">{pending}</span>
        )}
        <span className="sr-only">
          {pending > 0 ? `${pluralize(pending, 'envío')} sin revelar` : 'Pendiente de revelar'}
        </span>
      </>
    )
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
  const postCounters = hasPostCounters(problems)
  const statsScope = footerScopeLabel(phase, postCounters)
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
                <FooterCounterCell
                  key={problem.slug}
                  counter={footerCounter(problem, 'accepted', phase, postCounters)}
                  className="font-semibold text-status-success"
                />
              ))}
            </tr>
            <tr>
              <td className={FOOT_CELL} />
              <td className={cn(FOOT_CELL, 'pl-3 text-left text-neutral-text-muted')}>{`Intentos${statsScope}`}</td>
              <td className={FOOT_CELL} />
              <td className={FOOT_CELL} />
              {problems.map((problem) => (
                <FooterCounterCell
                  key={problem.slug}
                  counter={footerCounter(problem, 'tried', phase, postCounters)}
                  className="text-neutral-text-muted"
                />
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
