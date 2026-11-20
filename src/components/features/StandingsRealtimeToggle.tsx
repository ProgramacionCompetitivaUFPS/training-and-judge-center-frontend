import { Eye } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'

interface StandingsRealtimeToggleProps {
  active: boolean
  onToggle: () => void
}

export function StandingsRealtimeToggle({ active, onToggle }: StandingsRealtimeToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Ver resultados reales"
            aria-pressed={active}
            onClick={onToggle}
            className={cn(
              'h-8 w-8 border border-neutral-border p-0',
              active
                ? 'bg-neutral-text-primary text-neutral-text-inverse hover:bg-neutral-text-primary/90'
                : 'bg-neutral-surface text-neutral-text-muted',
            )}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{active ? 'Volver a la vista de participantes' : 'Ver resultados reales'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
