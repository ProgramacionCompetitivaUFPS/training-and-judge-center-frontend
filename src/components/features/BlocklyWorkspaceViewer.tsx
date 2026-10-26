import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import * as Es from 'blockly/msg/es'

import { registerCustomBlocks } from './blockly/customBlocks'
import './blockly/blockly-overrides.css'

interface BlocklyWorkspaceViewerProps {
  /** Workspace stored with the submission (Blockly XML). */
  workspaceXml: string
}

/**
 * Read-only view of a block editor submission, rebuilt from its workspace XML. Rendering the
 * blocks here (instead of serving an SVG uploaded by the user) keeps user-controlled markup out
 * of the page. Loaded lazily: Blockly is heavy and only Blockly submissions need it.
 */
export default function BlocklyWorkspaceViewer({ workspaceXml }: BlocklyWorkspaceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    let ws: Blockly.WorkspaceSvg | null = null
    try {
      Blockly.setLocale(Es as unknown as Record<string, string>)
      registerCustomBlocks()
      ws = Blockly.inject(containerRef.current, {
        readOnly: true,
        scrollbars: true,
        move: { scrollbars: true, drag: true, wheel: true },
        zoom: { controls: true, wheel: false, maxScale: 2, minScale: 0.3 },
      })
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(workspaceXml), ws)
      // Fit the whole program, but never blow small programs up past their natural size.
      ws.zoomToFit()
      if (ws.scale > 1) ws.setScale(1)
      ws.scrollCenter()
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true)
    }
    return () => ws?.dispose()
  }, [workspaceXml])

  if (failed) {
    return (
      <p className="text-sm text-neutral-text-muted">
        No se pudieron mostrar los bloques de este envío. Puedes ver el código Python generado.
      </p>
    )
  }

  return (
    <div
      ref={containerRef}
      className="rounded-md border border-neutral-border overflow-hidden"
      style={{ height: 480, width: '100%', position: 'relative', zIndex: 0 }}
      aria-label="Bloques de la solución"
    />
  )
}
