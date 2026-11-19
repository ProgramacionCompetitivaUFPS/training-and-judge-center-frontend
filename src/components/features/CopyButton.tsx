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

/** Small "Copiar" button that copies `text` to the clipboard and confirms with "Copiado" for 2 s. */
export function CopyButton({ text, label, className }: CopyButtonProps) {
  const { toast } = useToastContext()
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ variant: 'error', title: 'No se pudo copiar', description: 'El navegador no permitió acceder al portapapeles.' })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn('gap-1.5', className)}
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  )
}
