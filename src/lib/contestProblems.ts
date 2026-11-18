import type { ContestProblem, ContestProblemPayload } from '@/types/contest'

import { isValidBalloonColor, resolveBalloonColor } from './balloon'

export function buildColorUpdatePayload(
  problems: ContestProblem[],
  colors: Record<string, string>,
): ContestProblemPayload[] | null {
  const sorted = [...problems].sort((a, b) => a.position - b.position)

  const changed = new Set<string>()
  for (const problem of sorted) {
    const chosen = colors[problem.slug]
    if (isValidBalloonColor(chosen) && chosen.toLowerCase() !== resolveBalloonColor(problem.color)) {
      changed.add(problem.slug)
    }
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
