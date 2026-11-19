import { Link, useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { BalloonColorPicker } from '@/components/features/BalloonColorPicker'
import { BalloonIcon } from '@/components/features/BalloonIcon'
import { PATHS } from '@/lib/constants'
import { resolveBalloonColor } from '@/lib/balloon'
import { problemLabel } from '@/lib/utils'
import type { ContestProblem } from '@/types/contest'

interface ContestProblemsTableProps {
  problems: ContestProblem[]
  groupId: string
  contestId: string
  showSubmit?: boolean
  /** Si se pasa, los globos son editables: recibe el slug y el color nuevo ("#rrggbb"). */
  onColorChange?: (slug: string, color: string) => void
  /** Deshabilita la edición de color (p. ej. mientras se guarda un cambio). */
  colorsDisabled?: boolean
}

export function ContestProblemsTable({ problems, groupId, contestId, showSubmit, onColorChange, colorsDisabled }: ContestProblemsTableProps) {
  const navigate = useNavigate()

  if (problems.length === 0) {
    return <p className="text-neutral-text-muted text-sm text-center py-8">No hay problemas disponibles.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 pl-6">Letra</TableHead>
          <TableHead>Problema</TableHead>
          <TableHead className="w-24">Tiempo</TableHead>
          <TableHead className="w-24">Memoria</TableHead>
          {showSubmit && <TableHead className="w-24 text-right pr-6" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {problems.map((p) => {
          const letter = problemLabel(p.position)
          return (
            <TableRow key={p.slug} className="group">
              <TableCell className="pl-6">
                {onColorChange ? (
                  <BalloonColorPicker
                    variant="letter"
                    letter={letter}
                    title={p.title}
                    color={p.color}
                    disabled={colorsDisabled}
                    onChange={(color) => onColorChange(p.slug, color)}
                  />
                ) : (
                  <span role="img" aria-label={`Problema ${letter}`} className="flex w-fit p-1">
                    <BalloonIcon color={resolveBalloonColor(p.color)} letter={letter} className="h-11 w-9" />
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Link
                  to={PATHS.contestProblem(groupId, contestId, letter)}
                  className="font-semibold text-neutral-text-primary hover:text-brand-primary transition-colors"
                >
                  {p.title}
                </Link>
              </TableCell>
              <TableCell className="text-sm font-medium">{p.timeLimit}ms</TableCell>
              <TableCell className="text-sm font-medium">{p.memoryLimit} MiB</TableCell>
              {showSubmit && (
                <TableCell className="text-right pr-6">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(PATHS.contestSubmit(groupId, contestId, letter))}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Enviar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
