import type { ContestDetail, ContestProblem, ContestProblemPayload, UpdateContestResponse } from '@/types/contest'

import { isValidBalloonColor } from './balloon'

/**
 * Arma el `problems` del PUT de la competencia para cambiar colores.
 * `colors[slug]` es el "#rrggbb" elegido. Solo los problemas cuyo color elegido difiere del guardado
 * llevan `color` (el backend conserva el color de los items que lo omiten); un problema sin color
 * guardado (null/ausente) cuenta como distinto de cualquier color, incluido el blanco.
 * Devuelve `null` si no hay ningún cambio real.
 */
export function buildColorUpdatePayload(
  problems: ContestProblem[],
  colors: Record<string, string>,
): ContestProblemPayload[] | null {
  const sorted = [...problems].sort((a, b) => a.position - b.position)

  const changed = new Set<string>()
  for (const problem of sorted) {
    const chosen = colors[problem.slug]
    if (!isValidBalloonColor(chosen)) continue
    const stored = isValidBalloonColor(problem.color) ? problem.color.toLowerCase() : null
    if (chosen.toLowerCase() !== stored) changed.add(problem.slug)
  }

  if (changed.size === 0) return null

  return sorted.map((problem, index) => {
    const item: ContestProblemPayload = { slug: problem.slug, order: index + 1 }
    if (changed.has(problem.slug)) {
      item.color = colors[problem.slug].toLowerCase()
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
