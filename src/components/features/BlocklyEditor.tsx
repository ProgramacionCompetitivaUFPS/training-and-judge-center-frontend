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
import { pythonGenerator, Order } from 'blockly/python'

// Force Python 3 input() — Blockly's built-in text_prompt_ext uses raw_input (Python 2).
// definitions_ is reset by init() on each getCode() call, so we override forBlock instead.
type PythonGen = typeof pythonGenerator & {
  provideFunction_: (name: string, code: string) => string
  FUNCTION_NAME_PLACEHOLDER_: string
}

function _makeInputHelper(gen: PythonGen): string {
  // provideFunction_ is an internal Blockly API. If a Blockly upgrade removes it,
  // fall back to raw_input so the editor stays functional while the warning is visible.
  if (typeof gen.provideFunction_ !== 'function' || typeof gen.FUNCTION_NAME_PLACEHOLDER_ !== 'string') {
    console.warn('BlocklyEditor: provideFunction_ not available — Python 2 raw_input fallback active. Check Blockly version.')
    return 'raw_input'
  }
  return gen.provideFunction_(
    'text_prompt',
    `def ${gen.FUNCTION_NAME_PLACEHOLDER_}(msg):\n  try:\n    return input(msg)\n  except EOFError:\n    return ''\n`,
  )
}

// text_prompt — classic block: message is a plain text FIELD, no type dropdown.
pythonGenerator.forBlock['text_prompt'] = (block, generator) => {
  const raw = block.getFieldValue('TEXT') ?? ''
  const msg = `'${raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  const gen = generator as unknown as PythonGen
  if (typeof gen.provideFunction_ !== 'function') {
    return [`raw_input(${msg})`, Order.FUNCTION_CALL]
  }
  return [`${_makeInputHelper(gen)}(${msg})`, Order.FUNCTION_CALL]
}

// text_prompt_ext — extended block: message is a connected VALUE input; TYPE dropdown INT/FLOAT/STR.
// We re-register the block definition to replace Blockly's built-in NUMBER/TEXT dropdown with our
// three-option type selector, matching read_value.
Blockly.Blocks['text_prompt_ext'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('TEXT').setCheck('String').appendField('pedir')
    // Validator migrates values saved by the old built-in block (NUMBER→FLOAT, TEXT→STR).
    const typeField = new Blockly.FieldDropdown(
      READ_TYPE_OPTIONS as Blockly.MenuGenerator,
      function(this: Blockly.FieldDropdown, newValue: string): string {
        if (newValue === 'NUMBER') return 'FLOAT'
        if (newValue === 'TEXT') return 'STR'
        return newValue
      },
    )
    this.appendDummyInput().appendField(typeField, 'TYPE')
    this.setOutput(true, 'Number') // INT is the first (default) option
    this.setColour(160)
    this.setInputsInline(true)
    this.setTooltip('Muestra un mensaje al usuario y lee su respuesta según el tipo seleccionado.')
    this.setHelpUrl('')
  },
  onchange(this: Blockly.Block) {
    if (!this.workspace) return
    const type = this.getFieldValue('TYPE') as string
    if (type) this.setOutput(true, type === 'STR' ? 'String' : 'Number')
  },
}
pythonGenerator.forBlock['text_prompt_ext'] = (block, generator) => {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || "''"
  const type = (block.getFieldValue('TYPE') ?? 'STR') as ReadType
  const gen = generator as unknown as PythonGen
  const call = `${_makeInputHelper(gen)}(${text})`
  return [wrapWithType(call, type), Order.FUNCTION_CALL]
}

import { registerCustomBlocks } from './blockly/customBlocks'
import { READ_TYPE_OPTIONS, wrapWithType, type ReadType } from './blockly/customBlocks/inputBlocks'
import { BLOCKLY_TOOLBOX } from './blockly/toolboxConfig'
import { DEFAULT_WORKSPACE_XML } from './blockly/defaultWorkspace'
import { useBlocklyPersistence } from '@/hooks/useBlocklyPersistence'
import './blockly/blockly-overrides.css'

export interface BlocklyEditorHandle {
  getCode(): string
  getXml(): string
  isEmpty(): boolean
  reset(): void
  loadXml(xml: string): void
}

interface BlocklyEditorProps {
  problemSlug: string
  onEmptyChange?: (isEmpty: boolean) => void
  onError?: (error: Error) => void
  /** Called once the workspace exists, so a caller can load into an editor that was still mounting. */
  onReady?: () => void
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
  function BlocklyEditor({ problemSlug, onEmptyChange, onError, onReady }, ref) {
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
        try {
          loadXmlToWorkspace(ws, xml)
          persistenceRef.current.save(xml)
        } catch {
          // ignore load errors
        }
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
        onReady?.()

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

export default BlocklyEditor
