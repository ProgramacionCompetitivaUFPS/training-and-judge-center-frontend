import type { ContestDetail, ContestProblem, ContestProblemPayload, UpdateContestResponse } from '@/types/contest'

import { isValidBalloonColor, resolveBalloonColor } from './balloon'

/**
 * Arma el `problems` del PUT de la competencia para cambiar colores.
 * `colors[slug]`: "#rrggbb" = nuevo color, `null` = quitar el color.
 * Solo los problemas que realmente cambian llevan `color` (el backend conserva el color
 * de los items que lo omiten). Devuelve `null` si no hay ningún cambio real.
 */
export function buildColorUpdatePayload(
  problems: ContestProblem[],
  colors: Record<string, string | null>,
): ContestProblemPayload[] | null {
  const sorted = [...problems].sort((a, b) => a.position - b.position)

  const changed = new Map<string, string | null>()
  for (const problem of sorted) {
    if (!(problem.slug in colors)) continue
    const chosen = colors[problem.slug]
    if (chosen === null) {
      if (problem.color != null) changed.set(problem.slug, null)
    } else if (isValidBalloonColor(chosen) && chosen.toLowerCase() !== resolveBalloonColor(problem.color)) {
      changed.set(problem.slug, chosen.toLowerCase())
    }
  }

  if (changed.size === 0) return null

  return sorted.map((problem, index) => {
    const item: ContestProblemPayload = { slug: problem.slug, order: index + 1 }
    if (changed.has(problem.slug)) {
      item.color = changed.get(problem.slug)
    }
    return item
  })
}

/**
 * Fusiona la respuesta del PUT con el detalle ya cacheado. La respuesta es parcial (ver
 * `UpdateContestResponse`): sin esto la caché quedaba con `position`, `participantCount`, límites,
 * etc. en `undefined` hasta el siguiente refetch. Devuelve `undefined` si no hay detalle previo
 * con el que fusionar (quien llama decide qué hacer en ese caso).
 */
export function mergeContestUpdate(
  previous: ContestDetail | undefined,
  updated: UpdateContestResponse,
): ContestDetail | undefined {
  if (!previous) return undefined

  const { problems: updatedProblems, ...fields } = updated
  const problems = updatedProblems
    ? updatedProblems.map((problem) => {
        const { order, ...rest } = problem
        const before = previous.problems.find((p) => p.slug === problem.slug)
        return { ...before, ...rest, position: rest.position ?? order ?? before?.position } as ContestProblem
      })
    : previous.problems

  return { ...previous, ...fields, problems }
}
