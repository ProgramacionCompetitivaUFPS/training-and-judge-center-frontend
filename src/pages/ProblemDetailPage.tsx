import { useState } from 'react'
import { ProblemLayout } from '@/components/layout/ProblemLayout'
import { CodeEditor } from '@/components/features/CodeEditor'
import { useToastContext } from '@/components/ui'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { Clock, Users, CheckCircle } from 'lucide-react'

// Mock data
const mockProblem = {
  id: '1',
  title: 'Two Sum',
  difficulty: 'easy' as const,
  category: ['Array', 'Hash Table'],
  description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    '-10^9 <= target <= 10^9',
    'Only one valid answer exists.',
  ],
  examples: [
    {
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
    },
    {
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
    },
    {
      input: 'nums = [3,3], target = 6',
      output: '[0,1]',
    },
  ],
  acceptanceRate: 48.5,
  totalSubmissions: 15234,
  totalAccepted: 7389,
}

const mockSubmissions = [
  {
    id: '1',
    status: 'AC' as const,
    language: 'C++',
    runtime: '4ms',
    memory: '10.2MB',
    timestamp: '2024-03-07 10:30:00',
  },
  {
    id: '2',
    status: 'WA' as const,
    language: 'Python',
    runtime: '-',
    memory: '-',
    timestamp: '2024-03-07 10:25:00',
  },
  {
    id: '3',
    status: 'TLE' as const,
    language: 'Java',
    runtime: '-',
    memory: '-',
    timestamp: '2024-03-07 10:20:00',
  },
]

export function ProblemDetailPage() {
  const { toast } = useToastContext()
  const [activeTab, setActiveTab] = useState('description')

  const handleSubmit = (code: string, language: string) => {
    console.log('Submitting:', { code, language })
    toast({
      variant: 'success',
      title: '¡Código enviado!',
      description: 'Tu solución está siendo evaluada...',
    })
  }

  const handleRun = (code: string, language: string) => {
    console.log('Running:', { code, language })
    toast({
      variant: 'default',
      title: 'Ejecutando código',
      description: 'Probando con los casos de ejemplo...',
    })
  }

  const difficultyVariant = {
    easy: 'success' as const,
    medium: 'primary' as const,
    hard: 'warning' as const,
  }

  // Left Panel - Problem Description
  const leftPanel = (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-2xl font-extrabold text-neutral-text-primary">
            {mockProblem.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={difficultyVariant[mockProblem.difficulty]}>
            {mockProblem.difficulty.toUpperCase()}
          </Badge>
          {mockProblem.category.map((cat) => (
            <Badge key={cat} variant="outline">
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-neutral-text-muted">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          <span>Aceptado: {mockProblem.totalAccepted}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>Envíos: {mockProblem.totalSubmissions}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Tasa: {mockProblem.acceptanceRate}%</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="description">Descripción</TabsTrigger>
          <TabsTrigger value="submissions">Mis Envíos</TabsTrigger>
          <TabsTrigger value="solutions">Soluciones</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="space-y-6 mt-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Descripción</h3>
            <p className="text-neutral-text-muted whitespace-pre-line leading-relaxed">
              {mockProblem.description}
            </p>
          </div>

          {/* Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Ejemplos</h3>
            <div className="space-y-4">
              {mockProblem.examples.map((example, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-md">Ejemplo {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-semibold">Input: </span>
                      <code className="text-sm bg-neutral-background px-2 py-1 rounded">
                        {example.input}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Output: </span>
                      <code className="text-sm bg-neutral-background px-2 py-1 rounded">
                        {example.output}
                      </code>
                    </div>
                    {example.explanation && (
                      <div>
                        <span className="font-semibold">Explicación: </span>
                        <span className="text-neutral-text-muted">
                          {example.explanation}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Constraints */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Restricciones</h3>
            <ul className="list-disc list-inside space-y-1 text-neutral-text-muted">
              {mockProblem.constraints.map((constraint, index) => (
                <li key={index}>{constraint}</li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Lenguaje</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>Memoria</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <SubmissionStatusBadge status={submission.status} />
                  </TableCell>
                  <TableCell>{submission.language}</TableCell>
                  <TableCell>{submission.runtime}</TableCell>
                  <TableCell>{submission.memory}</TableCell>
                  <TableCell className="text-sm text-neutral-text-muted">
                    {submission.timestamp}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="solutions" className="mt-6">
          <p className="text-neutral-text-muted">
            Las soluciones estarán disponibles después de resolver el problema.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )

  // Right Panel - Code Editor
  const rightPanel = (
    <div className="p-6">
      <CodeEditor onSubmit={handleSubmit} onRun={handleRun} />
    </div>
  )

  return <ProblemLayout leftPanel={leftPanel} rightPanel={rightPanel} />
}
