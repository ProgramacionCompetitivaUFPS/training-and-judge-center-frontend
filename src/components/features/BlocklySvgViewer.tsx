import { useState, useCallback, useRef, type MouseEvent, type WheelEvent } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'

interface BlocklySvgViewerProps {
  svgUrl: string
  alt?: string
}

const MIN_SCALE = 0.25
const MAX_SCALE = 4
const ZOOM_STEP = 0.25

export function BlocklySvgViewer({ svgUrl, alt = 'Bloques Blockly' }: BlocklySvgViewerProps) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    setScale((prev) => clampScale(prev + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)))
  }, [])

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      setIsDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY }
      translateStart.current = { x: translate.x, y: translate.y }
    },
    [translate],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      setTranslate({
        x: translateStart.current.x + (e.clientX - dragStart.current.x),
        y: translateStart.current.y + (e.clientY - dragStart.current.y),
      })
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleZoomIn = () => setScale((prev) => clampScale(prev + ZOOM_STEP))
  const handleZoomOut = () => setScale((prev) => clampScale(prev - ZOOM_STEP))
  const handleReset = () => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={handleZoomIn} aria-label="Acercar">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut} aria-label="Alejar">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset} aria-label="Restablecer zoom">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <span className="text-xs text-neutral-text-muted ml-2">{Math.round(scale * 100)}%</span>
      </div>
      <div
        className="relative overflow-hidden rounded-lg border border-neutral-border bg-white"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={svgUrl}
          alt={alt}
          draggable={false}
          className="select-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        />
      </div>
    </div>
  )
}
