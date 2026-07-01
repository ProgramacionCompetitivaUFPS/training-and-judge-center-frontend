import { Link, useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { PATHS } from '@/lib/constants'

interface ContestProblem {
  position: number
  slug: string
  title: string
  timeLimit: number
  memoryLimit: number
}

interface ContestProblemsTableProps {
  problems: ContestProblem[]
  groupId: string
  contestId: string
  showSubmit?: boolean
}

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function ContestProblemsTable({ problems, groupId, contestId, showSubmit }: ContestProblemsTableProps) {
  const navigate = useNavigate()

  if (problems.length === 0) {
    return <p className="text-neutral-text-muted text-sm py-4">No hay problemas disponibles.</p>
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
          const letter = LABELS[p.position - 1] || String(p.position)
          return (
            <TableRow key={p.slug} className="group">
              <TableCell className="pl-6">
                <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-background font-extrabold text-brand-primary text-lg">
                  {letter}
                </span>
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
