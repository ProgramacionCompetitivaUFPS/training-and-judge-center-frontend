import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { ProblemFilters as Filters } from '@/types'
import { Search } from 'lucide-react'

interface ProblemFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export function ProblemFilters({ filters, onFiltersChange }: ProblemFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
        <Input
          placeholder="Buscar problemas..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>
      
      <Select
        value={filters.difficulty || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            difficulty: value === 'all' ? undefined : (value as 'easy' | 'medium' | 'hard'),
          })
        }
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Dificultad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value === 'all' ? undefined : (value as 'solved' | 'attempted' | 'unsolved'),
          })
        }
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="solved">Resueltos</SelectItem>
          <SelectItem value="attempted">Intentados</SelectItem>
          <SelectItem value="unsolved">Sin resolver</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
