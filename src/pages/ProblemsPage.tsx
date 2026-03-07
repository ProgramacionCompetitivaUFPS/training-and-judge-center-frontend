import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProblemCard } from '@/components/features/ProblemCard'
import { ProblemFilters } from '@/components/features/ProblemFilters'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui'
import { Problem, ProblemFilters as Filters } from '@/types'
import { SkeletonCard } from '@/components/ui'
import { Code2 } from 'lucide-react'

// Mock data
const mockProblems: Problem[] = [
  {
    id: '1',
    title: 'Two Sum',
    difficulty: 'easy',
    category: ['Array', 'Hash Table'],
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
    ],
    acceptanceRate: 48.5,
    totalSubmissions: 15234,
    totalAccepted: 7389,
  },
  {
    id: '2',
    title: 'Binary Search',
    difficulty: 'medium',
    category: ['Binary Search', 'Array'],
    description: 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums.',
    constraints: ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4'],
    examples: [
      {
        input: 'nums = [-1,0,3,5,9,12], target = 9',
        output: '4',
        explanation: '9 exists in nums and its index is 4',
      },
    ],
    acceptanceRate: 55.2,
    totalSubmissions: 8932,
    totalAccepted: 4930,
  },
  {
    id: '3',
    title: 'Graph Traversal',
    difficulty: 'hard',
    category: ['Graph', 'DFS', 'BFS'],
    description: 'Given a directed acyclic graph, find all possible paths from source to target.',
    constraints: ['2 <= n <= 15', '0 <= graph[i][j] < n'],
    examples: [
      {
        input: 'graph = [[1,2],[3],[3],[]]',
        output: '[[0,1,3],[0,2,3]]',
        explanation: 'There are two paths: 0 -> 1 -> 3 and 0 -> 2 -> 3.',
      },
    ],
    acceptanceRate: 32.8,
    totalSubmissions: 5621,
    totalAccepted: 1844,
  },
]

export function ProblemsPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [isLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredProblems = mockProblems.filter((problem) => {
    if (filters.difficulty && problem.difficulty !== filters.difficulty) return false
    if (filters.search && !problem.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Problemas', icon: Code2 },
      ]}
      showSidebar={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-text-primary mb-2">
            Problemas de Programación
          </h1>
          <p className="text-neutral-text-muted">
            Practica y mejora tus habilidades resolviendo problemas algorítmicos
          </p>
        </div>

        {/* Filters */}
        <ProblemFilters filters={filters} onFiltersChange={setFilters} />

        {/* Problems List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                isSolved={problem.id === '1'}
                onClick={() => console.log('Navigate to problem', problem.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredProblems.length > 0 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive={currentPage === 1} onClick={() => setCurrentPage(1)}>
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive={currentPage === 2} onClick={() => setCurrentPage(2)}>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive={currentPage === 3} onClick={() => setCurrentPage(3)}>
                  3
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  )
}
