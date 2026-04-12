import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import * as Es from 'blockly/msg/es'
import { pythonGenerator } from 'blockly/python'

import { registerCustomBlocks } from './blockly/customBlocks'
import { BLOCKLY_TOOLBOX } from './blockly/toolboxConfig'
import { DEFAULT_WORKSPACE_XML } from './blockly/defaultWorkspace'
import { useBlocklyPersistence } from '@/hooks/useBlocklyPersistence'
import './blockly/blockly-overrides.css'

export interface BlocklyEditorHandle {
  getCode(): string
  getXml(): string
  getSvg(): Blob
  isEmpty(): boolean
  reset(): void
  loadXml(xml: string): void
}

interface BlocklyEditorProps {
  problemSlug: string
  onEmptyChange?: (isEmpty: boolean) => void
  onError?: (error: Error) => void
}

const WORKSPACE_CONFIG: Blockly.BlocklyOptions = {
  trashcan: true,
  collapse: true,
  comments: true,
  scrollbars: true,
  grid: {
    spacing: 20,
    length: 1,
    colour: '#888',
    snap: false,
  },
}

function loadXmlToWorkspace(workspace: Blockly.WorkspaceSvg, xml: string): void {
  const dom = Blockly.utils.xml.textToDom(xml)
  Blockly.Xml.domToWorkspace(dom, workspace)
}

const BlocklyEditor = forwardRef<BlocklyEditorHandle, BlocklyEditorProps>(
  function BlocklyEditor({ problemSlug, onEmptyChange, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
    const [initError, setInitError] = useState<string | null>(null)
    const lastEmptyRef = useRef<boolean | null>(null)
    const persistence = useBlocklyPersistence(problemSlug)

    // Stable refs for callbacks used in the change listener
    const onEmptyChangeRef = useRef(onEmptyChange)
    onEmptyChangeRef.current = onEmptyChange
    const persistenceRef = useRef(persistence)
    persistenceRef.current = persistence

    useImperativeHandle(ref, () => ({
      getCode(): string {
        const ws = workspaceRef.current
        if (!ws) return ''
        pythonGenerator.addReservedWords('code')
        return pythonGenerator.workspaceToCode(ws)
      },

      getXml(): string {
        const ws = workspaceRef.current
        if (!ws) return ''
        const dom = Blockly.Xml.workspaceToDom(ws)
        return Blockly.Xml.domToText(dom)
      },

      getSvg(): Blob {
        const ws = workspaceRef.current
        if (!ws) {
          return createPlaceholderSvg()
        }
        try {
          const canvas = (ws as unknown as { svgBlockCanvas_: SVGElement }).svgBlockCanvas_.cloneNode(true) as SVGElement
          canvas.removeAttribute('transform')

          const bbox = (
            (ws as unknown as { svgBlockCanvas_: SVGGraphicsElement }).svgBlockCanvas_
          ).getBBox()

          const css =
            '<defs><style type="text/css" xmlns="http://www.w3.org/1999/xhtml">' +
            '<![CDATA[' +
            'rect { height: 0; } .blocklyDropdownText { font-weight: bold; }' +
            ']]></style></defs>'

          const content = new XMLSerializer().serializeToString(canvas)

          const svgString =
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
            ` width="${bbox.width}" height="${bbox.height}"` +
            ` viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}">` +
            css +
            content +
            '</svg>'

          return new Blob([svgString], { type: 'image/svg+xml' })
        } catch {
          return createPlaceholderSvg()
        }
      },

      isEmpty(): boolean {
        const ws = workspaceRef.current
        if (!ws) return true
        return ws.getTopBlocks(false).length === 0
      },

      reset(): void {
        const ws = workspaceRef.current
        if (!ws) return
        ws.clear()
        loadXmlToWorkspace(ws, DEFAULT_WORKSPACE_XML)
        persistenceRef.current.clear()
      },

      loadXml(xml: string): void {
        const ws = workspaceRef.current
        if (!ws) return
        ws.clear()
        loadXmlToWorkspace(ws, xml)
        persistenceRef.current.save(xml)
      },
    }))

    const handleWorkspaceChange = useCallback(() => {
      const ws = workspaceRef.current
      if (!ws) return

      // Auto-save
      try {
        const dom = Blockly.Xml.workspaceToDom(ws)
        const xml = Blockly.Xml.domToText(dom)
        persistenceRef.current.save(xml)
      } catch {
        // ignore save errors
      }

      // Notify empty state changes
      const empty = ws.getTopBlocks(false).length === 0
      if (lastEmptyRef.current !== empty) {
        lastEmptyRef.current = empty
        onEmptyChangeRef.current?.(empty)
      }
    }, [])

    useEffect(() => {
      if (!containerRef.current) return

      try {
        Blockly.setLocale(Es as unknown as Record<string, string>)
        registerCustomBlocks()

        const ws = Blockly.inject(containerRef.current, {
          ...WORKSPACE_CONFIG,
          toolbox: BLOCKLY_TOOLBOX,
        })
        workspaceRef.current = ws

        // Load persisted XML or default workspace
        const savedXml = persistence.load()
        const xmlToLoad = savedXml ?? DEFAULT_WORKSPACE_XML
        loadXmlToWorkspace(ws, xmlToLoad)

        // Initial empty state notification
        const empty = ws.getTopBlocks(false).length === 0
        lastEmptyRef.current = empty
        onEmptyChange?.(empty)

        ws.addChangeListener(handleWorkspaceChange)

        return () => {
          ws.removeChangeListener(handleWorkspaceChange)
          ws.dispose()
          workspaceRef.current = null
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setInitError('No se pudo cargar el editor de bloques. Por favor, recarga la página.')
        onError?.(error)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (initError) {
      return (
        <div
          style={{
            minHeight: 480,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            padding: 24,
          }}
        >
          {initError}
        </div>
      )
    }

    return <div ref={containerRef} style={{ height: 480, width: '100%', position: 'relative', zIndex: 0 }} />
  },
)

function createPlaceholderSvg(): Blob {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">' +
    '<text x="10" y="30" font-size="14" fill="#666">Error al generar imagen</text>' +
    '</svg>'
  return new Blob([svg], { type: 'image/svg+xml' })
}

export default BlocklyEditor
