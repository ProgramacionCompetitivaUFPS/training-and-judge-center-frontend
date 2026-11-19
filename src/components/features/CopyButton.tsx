import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToastContext } from '@/hooks/useToastContext'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  /** Text written to the clipboard, exactly as given. */
  text: string
  /** Accessible name of the button; make it unique when several buttons share a page. */
  label: string
  className?: string
}

/** Icon-only button that copies `text` to the clipboard and shows a check ("Copiado" tooltip) for 2 s. */
export function CopyButton({ text, label, className }: CopyButtonProps) {
  const { toast } = useToastContext()
  // The text whose copy was confirmed; the check only shows while it still matches `text`.
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const copied = copiedText === text
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopiedText(null), 2000)
    } catch {
      toast({ variant: 'error', title: 'No se pudo copiar', description: 'El navegador no permitió acceder al portapapeles.' })
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn('h-8 w-8 p-0 text-neutral-text-muted hover:text-neutral-text-primary', className)}
      aria-label={label}
      title={copied ? 'Copiado' : 'Copiar'}
    >
      {copied ? <Check className="h-4 w-4 text-status-success" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}
