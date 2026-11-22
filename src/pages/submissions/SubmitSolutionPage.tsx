import React, { Suspense, useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Send, Upload, FileText, Clock, HardDrive, Lightbulb, UploadIcon, X } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { RecoveryBanner } from '@/components/features/RecoveryBanner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadErrorBoundary } from '@/components/ui/LoadErrorBoundary'
import { useContestSession } from '@/hooks/useContestSession'
import { useToastContext } from '@/hooks/useToastContext'
import { useProblemDetail, useProblemSearch } from '@/hooks/api/useProblems'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useMySubmissions, useSubmitSolution, useSubmitContestSolution, useSubmitBlocklySolution, useSubmitBlocklyContestSolution } from '@/hooks/api/useSubmissions'
import { useSubmissionRecovery } from '@/hooks/useSubmissionRecovery'
import { useDebounce } from '@/hooks/useDebounce'
import { PROGRAMMING_LANGUAGES, PATHS, JUDGE_LANGUAGES, judgeLanguage, languageForFilename, isLanguageTemplate } from '@/lib/constants'
import { problemLabel } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errorMessages'
import { readLastSubmissionLanguage, saveLastSubmissionLanguage } from '@/lib/lastSubmissionLanguage'
import { PyodideRunner } from '@/components/features/blockly/PyodideRunner'
import type { BlocklyEditorHandle } from '@/components/features/BlocklyEditor'
import type { SubmissionStatus } from '@/types/submission'

const BlocklyEditor = React.lazy(() => import('@/components/features/BlocklyEditor'))
// CodeMirror only loads on this page, so the rest of the app doesn't carry it.
const CodeEditor = React.lazy(() => import('@/components/features/CodeEditor'))

// Every extension the judge accepts, for the file picker.
const ACCEPTED_EXTENSIONS = Object.values(JUDGE_LANGUAGES).flatMap((cfg) => cfg.accept).join(',')

const MAX_FILE_BYTES = 1024 * 1024

function readFileText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => resolve((ev.target?.result as string) || '')
    reader.readAsText(file)
  })
}

type Toast = ReturnType<typeof useToastContext>['toast']

/** What happens when the server answers a submission: tell the user, and remember the language if it was accepted. */
function submitCallbacks(toast: Toast, language: string, afterSuccess?: () => void) {
  return {
    onSuccess: (res: { id: string }) => {
      toast({ variant: 'success', title: 'Solución enviada', description: `Envío ${res.id.slice(0, 12)} creado` })
      saveLastSubmissionLanguage(language)
      afterSuccess?.()
    },
    onError: (err: unknown) => {
      toast({ variant: 'error', title: 'No se pudo enviar la solución', description: getErrorMessage(err) })
    },
  }
}

/** In a contest the picker holds the problem's letter; outside one it holds the slug itself. */
function resolveProblemSlug(
  isContestContext: boolean,
  selectedProblem: string,
  contestProblems: { slug: string; position: number }[] | undefined,
): string {
  if (!isContestContext) return selectedProblem
  const found = contestProblems?.find((prob) => problemLabel(prob.position) === selectedProblem.toUpperCase())
  return found?.slug || ''
}

/** Name of a public top-level class other than Solution, if the Java code declares one. */
function wrongJavaClassName(code: string): string | undefined {
  // The indentation excludes line breaks: with `\s*` every blank line is a new start that rescans the whole run
  // of blank lines after it, which is quadratic and runs on every keystroke.
  const name = /^[^\S\r\n\u2028\u2029]*public\s+(?:final\s+|abstract\s+)*class\s+(\w+)/m.exec(code)?.[1]
  return name && name !== 'Solution' ? name : undefined
}

/** Something was typed or loaded: not empty and not just the language's starter template. */
const hasRealCode = (code: string) => code.trim().length > 0 && !isLanguageTemplate(code)

interface SubmitActionsDeps {
  toast: Toast
  isBlockly: boolean
  language: string
  code: string
  resolvedSlug: string
  blocklyRef: React.RefObject<BlocklyEditorHandle>
  fileInputRef: React.RefObject<HTMLInputElement>
  setCode: (code: string) => void
  setUploadedFile: (file: { name: string; size: number } | null) => void
  /** Where a contest submission goes; undefined for a practice submission. */
  contestTarget: { groupId: string; contestId: string } | undefined
}

/** Sends the current solution (source file or Blockly workspace) to the right endpoint. */
function useSubmitActions({
  toast, isBlockly, language, code, resolvedSlug, blocklyRef, fileInputRef, setCode, setUploadedFile, contestTarget,
}: SubmitActionsDeps) {
  const submitMutation = useSubmitSolution()
  const contestSubmitMutation = useSubmitContestSolution()
  const blocklySubmitMutation = useSubmitBlocklySolution()
  const blocklyContestSubmitMutation = useSubmitBlocklyContestSolution()
  const isSubmitting = [submitMutation, contestSubmitMutation, blocklySubmitMutation, blocklyContestSubmitMutation].some((m) => m.isPending)

  const submitBlockly = () => {
    const editor = blocklyRef.current
    if (!editor || !resolvedSlug) return
    const payload = { problemSlug: resolvedSlug, pythonCode: editor.getCode(), workspaceXml: editor.getXml() }
    const callbacks = submitCallbacks(toast, language)
    if (contestTarget) blocklyContestSubmitMutation.mutate({ ...contestTarget, ...payload }, callbacks)
    else blocklySubmitMutation.mutate(payload, callbacks)
  }

  const submitSource = () => {
    if (!resolvedSlug || !language || !code.trim()) return
    const config = judgeLanguage(language)
    const payload = {
      problemSlug: resolvedSlug,
      file: new File([code], `solution.${config?.fileExtension ?? 'txt'}`, { type: 'text/plain' }),
      language,
      compiler: config?.compiler ?? language,
    }
    const callbacks = submitCallbacks(toast, language, () => {
      // Back to the starting point, so the next attempt doesn't begin from an empty editor.
      setCode(config?.template ?? '')
      setUploadedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
    if (contestTarget) contestSubmitMutation.mutate({ ...contestTarget, ...payload }, callbacks)
    else submitMutation.mutate(payload, callbacks)
  }

  return { isSubmitting, handleSubmit: isBlockly ? submitBlockly : submitSource }
}

type SubmissionDetail = NonNullable<ReturnType<typeof useSubmissionRecovery>['submissionDetail']>

/** Why a past submission cannot be put back in the editor, or null when it can. */
function submissionLoadWarning(detail: SubmissionDetail): { title: string; description: string } | null {
  if (detail.language === 'blockly') {
    return detail.workspaceXml
      ? null
      : {
          title: 'XML no disponible',
          description: 'Este envío de Blockly no tiene workspaceXml. Solo está disponible el código Python como referencia.',
        }
  }
  return detail.sourceCode === null
    ? { title: 'Código fuente no disponible', description: 'El archivo del código fuente de este envío ya no existe.' }
    : null
}

interface LoadPastSubmissionDeps {
  isBlockly: boolean
  code: string
  language: string
  setLanguage: (language: string) => void
  setCode: (code: string) => void
  blocklyRef: React.RefObject<BlocklyEditorHandle>
  pendingBlocklyXmlRef: React.MutableRefObject<{ xml: string; problemSlug: string } | null>
  toast: Toast
  resolvedSlug: string
  recoverableSubmission: { id: string } | null | undefined
  loadSubmission: (submissionId: string) => void
  submissionDetail: SubmissionDetail | null | undefined
}

/**
 * Puts a past submission back in the editor. When the editor already has work the user must confirm first;
 * the submission's detail is fetched by `loadSubmission` and applied here once it arrives.
 */
function useLoadPastSubmission({
  isBlockly, code, language, setLanguage, setCode, blocklyRef, pendingBlocklyXmlRef, toast,
  resolvedSlug, recoverableSubmission, loadSubmission, submissionDetail,
}: LoadPastSubmissionDeps) {
  const [showConfirmLoad, setShowConfirmLoad] = useState(false)
  const [loadedSubmissionId, setLoadedSubmissionId] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [pendingLoadSubmissionId, setPendingLoadSubmissionId] = useState<string | null>(null)
  const [pendingLoadLanguage, setPendingLoadLanguage] = useState<string | null>(null)

  // Reset banner when problem or language changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBannerDismissed(false)
    setLoadedSubmissionId(null)
  }, [resolvedSlug, language])

  const hasEditorChanges = useCallback((): boolean => {
    if (isBlockly) return true // Blockly always has content (default or user blocks)
    return hasRealCode(code)
  }, [isBlockly, code])

  const applySubmissionToEditor = useCallback((detail: typeof submissionDetail) => {
    if (!detail) return

    const warning = submissionLoadWarning(detail)
    if (warning) {
      toast({ variant: 'warning', ...warning })
      return
    }

    if (detail.language === 'blockly') {
      if (blocklyRef.current) blocklyRef.current.loadXml(detail.workspaceXml!)
      else pendingBlocklyXmlRef.current = { xml: detail.workspaceXml!, problemSlug: detail.problem.slug }
    } else {
      setCode(detail.sourceCode!)
    }

    toast({
      variant: 'success',
      title: 'Envío cargado',
      description: `Contenido cargado desde el envío #${detail.id.slice(0, 8)}`,
    })
    setLoadedSubmissionId(detail.id)
    setBannerDismissed(true)
  }, [toast, blocklyRef, pendingBlocklyXmlRef, setCode])

  const handleRecoveryLoadClick = useCallback(() => {
    if (!recoverableSubmission) return
    if (hasEditorChanges()) {
      setPendingLoadSubmissionId(recoverableSubmission.id)
      setPendingLoadLanguage(null)
      setShowConfirmLoad(true)
    } else {
      loadSubmission(recoverableSubmission.id)
      setPendingLoadSubmissionId(recoverableSubmission.id)
    }
  }, [recoverableSubmission, hasEditorChanges, loadSubmission])

  const handleListLoadClick = useCallback((submissionId: string, submissionLanguage: string) => {
    const needsLanguageChange = submissionLanguage !== language
    if (hasEditorChanges()) {
      setPendingLoadSubmissionId(submissionId)
      setPendingLoadLanguage(needsLanguageChange ? submissionLanguage : null)
      setShowConfirmLoad(true)
    } else {
      if (needsLanguageChange) setLanguage(submissionLanguage)
      loadSubmission(submissionId)
      setPendingLoadSubmissionId(submissionId)
    }
  }, [language, setLanguage, hasEditorChanges, loadSubmission])

  const handleConfirmLoad = useCallback(() => {
    if (!pendingLoadSubmissionId) return
    if (pendingLoadLanguage) {
      setLanguage(pendingLoadLanguage)
    }
    // If detail is already cached, apply directly
    if (submissionDetail && submissionDetail.id === pendingLoadSubmissionId) {
      applySubmissionToEditor(submissionDetail)
      setPendingLoadSubmissionId(null)
      setShowConfirmLoad(false)
      return
    }
    loadSubmission(pendingLoadSubmissionId)
    setShowConfirmLoad(false)
  }, [pendingLoadSubmissionId, pendingLoadLanguage, setLanguage, loadSubmission, submissionDetail, applySubmissionToEditor])

  // Effect: apply loaded submission detail to editor when it arrives
  useEffect(() => {
    if (showConfirmLoad) return // Don't apply while confirmation dialog is open
    if (!submissionDetail || !pendingLoadSubmissionId) return
    if (submissionDetail.id !== pendingLoadSubmissionId) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    applySubmissionToEditor(submissionDetail)
    setPendingLoadSubmissionId(null)
  }, [submissionDetail, pendingLoadSubmissionId, showConfirmLoad, applySubmissionToEditor])

  return {
    showConfirmLoad,
    setShowConfirmLoad,
    loadedSubmissionId,
    setLoadedSubmissionId,
    bannerDismissed,
    handleRecoveryLoadClick,
    handleListLoadClick,
    handleConfirmLoad,
  }
}

function contestBreadcrumbs(groupName: string | undefined, groupId: string | undefined, contestName: string | undefined, contestId: string | undefined) {
  return [
    { label: 'Grupos', href: '/groups' },
    { label: groupName || '...', href: groupId ? PATHS.group(groupId) : undefined },
    { label: contestName || 'Competencia', href: PATHS.contest(groupId || '', contestId || '') },
    { label: 'Enviar solución' },
  ]
}

function practiceBreadcrumbs(problem: { title: string; slug: string } | undefined) {
  return [
    { label: 'Problemas', href: '/problems' },
    ...(problem ? [{ label: problem.title, href: PATHS.problem(problem.slug) }] : []),
    { label: 'Enviar solución' },
  ]
}

function JavaClassHint({ mismatch }: Readonly<{ mismatch: string | undefined }>) {
  // The judge compiles every Java source as Solution.java and runs `java Solution`
  // (judge_config.yaml), so `public class Main` is a Compilation Error.
  return (
    <p className={`text-xs mt-2 ${mismatch ? 'text-status-error font-medium' : 'text-neutral-text-muted'}`}>
      {mismatch
        ? `Tu clase pública se llama "${mismatch}": el juez la compila como Solution.java, así que dará Error de Compilación. Renómbrala a Solution.`
        : <>En Java, la clase principal debe llamarse <code className="font-mono">Solution</code> (<code className="font-mono">public class Solution</code>).</>}
    </p>
  )
}

type ProblemDetailData = NonNullable<ReturnType<typeof useProblemDetail>['data']>

function LimitRow({ icon, text, hasOverride }: Readonly<{ icon: React.ReactNode; text: string; hasOverride: boolean }>) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-neutral-text-primary">{text}</span>
      {hasOverride && <Badge variant="outline" className="text-[10px] py-0">override</Badge>}
    </div>
  )
}

/** judgedAs: the language the judge will run the code as (Blockly is judged as Python 3.10). */
function ProblemLimits({ problem, judgedAs }: Readonly<{ problem: ProblemDetailData; judgedAs: string }>) {
  const override = judgedAs ? problem.languageOverrides.find((lo) => lo.language === judgedAs) : undefined
  const time = override?.timeLimit ?? problem.timeLimit
  const memory = override?.memoryLimit ?? problem.memoryLimit
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Límites del problema</p>
        <LimitRow
          icon={<Clock className="h-4 w-4 text-neutral-text-muted" />}
          text={time ? `${time} ms` : 'No definido'}
          hasOverride={override?.timeLimit != null}
        />
        <LimitRow
          icon={<HardDrive className="h-4 w-4 text-neutral-text-muted" />}
          text={memory ? `${memory} MiB` : 'No definido'}
          hasOverride={override?.memoryLimit != null}
        />
      </CardContent>
    </Card>
  )
}

interface ProblemPickerProps {
  isContestContext: boolean
  selectedProblem: string
  onSelect: (value: string) => void
  contestProblems: { slug: string; title: string; position: number }[]
  problemTitle: string | undefined
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchResults: { slug: string; title: string }[]
  isSearching: boolean
}

function ProblemPicker({
  isContestContext, selectedProblem, onSelect, contestProblems, problemTitle,
  searchQuery, onSearchQueryChange, searchResults, isSearching,
}: Readonly<ProblemPickerProps>) {
  if (isContestContext) {
    return (
      <Select value={selectedProblem} onValueChange={onSelect}>
        <SelectTrigger aria-label="Problema">
          <SelectValue placeholder="Seleccionar problema" />
        </SelectTrigger>
        <SelectContent>
          {contestProblems.map((p) => {
            const letter = problemLabel(p.position)
            return (
              <SelectItem key={p.slug} value={letter}>
                {letter} — {p.title}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    )
  }
  if (selectedProblem) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-border bg-neutral-background px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-text-primary truncate">{problemTitle ?? selectedProblem}</p>
          <p className="text-xs text-neutral-text-muted font-mono truncate">{selectedProblem}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect('')}
          className="p-1 rounded hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
          aria-label="Cambiar problema"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }
  return (
    <SearchSelect
      query={searchQuery}
      onQueryChange={onSearchQueryChange}
      results={searchResults}
      isSearching={isSearching}
      placeholder="Buscar problema publicado por título..."
      emptyLabel="Sin resultados"
      hintLabel="Escribe al menos 2 caracteres"
      getKey={(p) => p.slug}
      renderItem={(p) => (
        <div>
          <p className="font-medium text-neutral-text-primary">{p.title}</p>
          <p className="text-xs text-neutral-text-muted font-mono">{p.slug}</p>
        </div>
      )}
      onSelect={(p) => {
        onSelect(p.slug)
        onSearchQueryChange('')
      }}
    />
  )
}

function EditorPlaceholderCard({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Card className="flex items-center justify-center" style={{ minHeight: 480 }}>
      <CardContent>
        <p className="text-neutral-text-muted">{children}</p>
      </CardContent>
    </Card>
  )
}

interface BlocklyAreaProps {
  editorRef: React.RefObject<BlocklyEditorHandle>
  resolvedSlug: string
  pendingXmlRef: React.MutableRefObject<{ xml: string; problemSlug: string } | null>
  onEmptyChange: (empty: boolean) => void
  onReset: () => void
}

function BlocklyArea({ editorRef, resolvedSlug, pendingXmlRef, onEmptyChange, onReset }: Readonly<BlocklyAreaProps>) {
  if (!resolvedSlug) {
    return <EditorPlaceholderCard>Selecciona un problema para usar el editor de bloques</EditorPlaceholderCard>
  }
  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            editorRef.current?.reset()
            onReset()
          }}
        >
          Reiniciar bloques
        </Button>
      </div>
      <LoadErrorBoundary fallback={<EditorPlaceholderCard>No se pudo cargar el editor de bloques. Recarga la página.</EditorPlaceholderCard>}>
        <Suspense fallback={<EditorPlaceholderCard>Cargando editor de bloques...</EditorPlaceholderCard>}>
          <BlocklyEditor
            ref={editorRef}
            problemSlug={resolvedSlug}
            onEmptyChange={onEmptyChange}
            onReady={() => {
              const pending = pendingXmlRef.current
              pendingXmlRef.current = null
              if (pending?.problemSlug === resolvedSlug) editorRef.current?.loadXml(pending.xml)
            }}
          />
        </Suspense>
      </LoadErrorBoundary>
      <PyodideRunner getCode={() => editorRef.current?.getCode() ?? ''} />
    </>
  )
}

interface SourceCodeCardProps {
  code: string
  language: string
  uploadedFile: { name: string; size: number } | null
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCodeChange: (value: string) => void
}

function SourceCodeCard({ code, language, uploadedFile, fileInputRef, onFileUpload, onCodeChange }: Readonly<SourceCodeCardProps>) {
  const codeSize = new Blob([code]).size
  const isOverLimit = codeSize > 1024 * 1024
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Código fuente</CardTitle>
        <div className="flex items-center gap-3">
          {uploadedFile && (
            <span className="text-xs text-neutral-text-muted flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
            </span>
          )}
          <span className={`text-xs ${isOverLimit ? 'text-status-error font-semibold' : 'text-neutral-text-muted'}`}>
            {(codeSize / 1024).toFixed(1)} KB / 1 MB
          </span>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            Cargar archivo
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" accept={ACCEPTED_EXTENSIONS} onChange={onFileUpload} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {/* If the editor's chunk can't load, a plain textarea still lets the user submit. */}
        <LoadErrorBoundary
          fallback={
            <textarea
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="Elige un lenguaje o pega tu código aquí…"
              spellCheck={false}
              aria-label="Editor de código"
              className="w-full min-h-[400px] rounded-md border border-neutral-border bg-neutral-background p-3 font-mono text-sm"
            />
          }
        >
          <Suspense fallback={<div className="min-h-[400px] rounded-md border border-neutral-border bg-neutral-background animate-pulse" />}>
            <CodeEditor
              value={code}
              onChange={onCodeChange}
              language={language}
              placeholder="Elige un lenguaje o pega tu código aquí…"
            />
          </Suspense>
        </LoadErrorBoundary>
      </CardContent>
    </Card>
  )
}

interface RecentSubmissionsCardProps {
  submissions: { id: string; submittedAt: string; language: string; status: string; memoryKb?: number | null }[]
  loadedSubmissionId: string | null
  isLoadingDetail: boolean
  onLoad: (submissionId: string, language: string) => void
}

function RecentSubmissionsCard({ submissions, loadedSubmissionId, isLoadingDetail, onLoad }: Readonly<RecentSubmissionsCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Envíos recientes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-border text-neutral-text-muted">
              <th className="text-left py-2 px-4 font-medium">ID</th>
              <th className="text-left py-2 px-4 font-medium">Tiempo</th>
              <th className="text-left py-2 px-4 font-medium">Lenguaje</th>
              <th className="text-left py-2 px-4 font-medium">Veredicto</th>
              <th className="text-right py-2 px-4 font-medium">Memoria</th>
              <th className="text-right py-2 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="border-b border-neutral-border last:border-0 hover:bg-neutral-background/50">
                <td className="py-2 px-4">
                  <Link to={`/submissions/${sub.id}`} className="font-mono text-brand-primary hover:underline">
                    {sub.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-2 px-4 text-neutral-text-muted">{formatRelativeTime(sub.submittedAt)}</td>
                <td className="py-2 px-4">
                  <Badge variant="outline" className="text-xs">{sub.language}</Badge>
                </td>
                <td className="py-2 px-4">
                  <SubmissionStatusBadge status={sub.status as SubmissionStatus} />
                </td>
                <td className="py-2 px-4 text-right text-neutral-text-muted">
                  {sub.memoryKb != null ? `${(sub.memoryKb / 1024).toFixed(1)} MiB` : '—'}
                </td>
                <td className="py-2 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLoad(sub.id, sub.language)}
                    disabled={loadedSubmissionId === sub.id || isLoadingDetail}
                  >
                    <UploadIcon className="h-3.5 w-3.5 mr-1" />
                    Cargar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export function SubmitSolutionPage() {
  const { groupId, contestId } = useParams<{ groupId?: string; contestId?: string }>()
  const [searchParams] = useSearchParams()
  const { toast } = useToastContext()
  const { contest: activeContest } = useContestSession()

  const isContestContext = !!contestId
  const problemParam = searchParams.get('problem') || ''
  const { data: contestGroup } = useGroupDetail(isContestContext ? groupId || '' : '')

  // State
  const [selectedProblem, setSelectedProblem] = useState(problemParam)
  const [problemSearchQuery, setProblemSearchQuery] = useState('')
  const debouncedProblemSearch = useDebounce(problemSearchQuery)
  const { data: problemSearchData, isFetching: isSearchingProblems } = useProblemSearch(debouncedProblemSearch)
  // The language of the last solution sent from this browser, so the next one starts with it (and with its
  // template, as if it had been picked).
  const [lastLanguage] = useState(readLastSubmissionLanguage)
  const [language, setLanguage] = useState(lastLanguage ?? '')
  const [code, setCode] = useState(judgeLanguage(lastLanguage ?? '')?.template ?? '')
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const blocklyRef = useRef<BlocklyEditorHandle>(null)
  // Workspace of a loaded submission that arrived while the block editor was still mounting
  // (loading a Blockly submission from another language switches to Blockly first). Tied to its
  // problem so a stale one never lands in another problem's workspace.
  const pendingBlocklyXmlRef = useRef<{ xml: string; problemSlug: string } | null>(null)
  const [isBlocklyEmpty, setIsBlocklyEmpty] = useState(true)

  // Resolve problem slug in contest context (letter → slug)
  const resolvedSlug = useMemo(
    () => resolveProblemSlug(isContestContext, selectedProblem, activeContest?.problems),
    [isContestContext, selectedProblem, activeContest],
  )

  // Fetch problem detail for limits display
  const { data: problemDetail } = useProblemDetail(resolvedSlug || '')

  // Recent submissions for selected problem
  const { data: recentSubmissions } = useMySubmissions(
    resolvedSlug ? { problemSlug: resolvedSlug, limit: 5 } : undefined
  )

  // Submission recovery
  const isBlockly = language === 'blockly'
  const javaClassMismatch = language === 'java17' ? wrongJavaClassName(code) : undefined

  const {
    recoverableSubmission,
    loadSubmission,
    submissionDetail,
    isLoadingDetail,
  } = useSubmissionRecovery({ problemSlug: resolvedSlug, language, contestId })

  // A workspace waiting for the block editor is abandoned once the page leaves Blockly mode.
  useEffect(() => {
    if (!isBlockly) pendingBlocklyXmlRef.current = null
  }, [isBlockly])

  const {
    showConfirmLoad,
    setShowConfirmLoad,
    loadedSubmissionId,
    setLoadedSubmissionId,
    bannerDismissed,
    handleRecoveryLoadClick,
    handleListLoadClick,
    handleConfirmLoad,
  } = useLoadPastSubmission({
    isBlockly, code, language, setLanguage, setCode, blocklyRef, pendingBlocklyXmlRef, toast,
    resolvedSlug, recoverableSubmission, loadSubmission, submissionDetail,
  })

  const { isSubmitting, handleSubmit } = useSubmitActions({
    toast, isBlockly, language, code, resolvedSlug, blocklyRef, fileInputRef, setCode, setUploadedFile,
    contestTarget: contestId && activeContest ? { groupId: activeContest.group.id, contestId } : undefined,
  })

  // Contest problems for selector
  const contestProblems = activeContest?.problems || []

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toast({ variant: 'error', title: 'Archivo muy grande', description: 'El límite es 1MB' })
      return
    }
    setUploadedFile({ name: file.name, size: file.size })
    // The extension decides the language, even over a previous pick: a .py file sent as C++ is
    // always a Compilation Error.
    const detected = languageForFilename(file.name)
    if (detected) setLanguage(detected)
    readFileText(file).then(setCode)
  }

  const handleLanguageSelect = (value: string) => {
    setLanguage(value)
    if (!code.trim() || isLanguageTemplate(code)) {
      setCode(judgeLanguage(value)?.template ?? '')
      setUploadedFile(null)
    }
  }

  const canSubmit = !isSubmitting && (isBlockly ? !!resolvedSlug && !isBlocklyEmpty : !!resolvedSlug && !!language && hasRealCode(code))

  const breadcrumbs = isContestContext
    ? contestBreadcrumbs(contestGroup?.name, groupId, activeContest?.name, contestId)
    : practiceBreadcrumbs(problemDetail)

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-text-primary">Enviar solución</h1>

        {/* Main grid: left panel (selectors) + right panel (code area) */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Left panel */}
          <div className="space-y-4">
            {/* Problem selector */}
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-text-primary mb-2">Problema</label>
                  <ProblemPicker
                    isContestContext={isContestContext}
                    selectedProblem={selectedProblem}
                    onSelect={setSelectedProblem}
                    contestProblems={contestProblems}
                    problemTitle={problemDetail?.title}
                    searchQuery={problemSearchQuery}
                    onSearchQueryChange={setProblemSearchQuery}
                    searchResults={problemSearchData?.problems ?? []}
                    isSearching={isSearchingProblems}
                  />
                </div>

                {/* Language selector */}
                <div>
                  <label className="block text-sm font-medium text-neutral-text-primary mb-2">Lenguaje</label>
                  <Select value={language} onValueChange={handleLanguageSelect}>
                    <SelectTrigger aria-label="Lenguaje">
                      <SelectValue placeholder="Seleccionar lenguaje" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRAMMING_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* The judge compiles every Java source as Solution.java and runs `java Solution`
                      (judge_config.yaml), so `public class Main` is a Compilation Error. */}
                  {language === 'java17' && <JavaClassHint mismatch={javaClassMismatch} />}
                </div>

                {/* Submit button */}
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  isLoading={isSubmitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar solución
                </Button>
              </CardContent>
            </Card>

            {/* Problem limits */}
            {problemDetail && <ProblemLimits problem={problemDetail} judgedAs={isBlockly ? 'python310' : language} />}

            {/* Tips */}
            <Card>
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-status-warning" />
                  <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Consejos</p>
                </div>
                <ul className="text-sm text-neutral-text-muted space-y-1.5 list-disc list-inside">
                  <li>Puedes pegar tu código directamente o cargar un archivo</li>
                  <li>Tamaño máximo: 1 MB</li>
                  <li>Asegúrate de seleccionar el lenguaje correcto</li>
                  <li>Revisa que tu código compile antes de enviar</li>
                  <li>Puedes cargar un envío anterior desde la tabla de envíos recientes</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right panel — code area */}
          <div className="space-y-4">
            {/* Recovery banner */}
            {recoverableSubmission && !loadedSubmissionId && !bannerDismissed && (
              <RecoveryBanner
                submission={recoverableSubmission}
                isLoaded={loadedSubmissionId === recoverableSubmission.id}
                contestContext={isContestContext ? (activeContest?.name ?? 'esta competencia') : undefined}
                onLoadClick={handleRecoveryLoadClick}
              />
            )}

            {isBlockly ? (
              <BlocklyArea
                editorRef={blocklyRef}
                resolvedSlug={resolvedSlug}
                pendingXmlRef={pendingBlocklyXmlRef}
                onEmptyChange={setIsBlocklyEmpty}
                onReset={() => setLoadedSubmissionId(null)}
              />
            ) : (
              <SourceCodeCard
                code={code}
                language={language}
                uploadedFile={uploadedFile}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                onCodeChange={(value) => {
                  setCode(value)
                  setUploadedFile(null)
                }}
              />
            )}
          </div>
        </div>

        {/* Recent submissions */}
        {resolvedSlug && recentSubmissions && recentSubmissions.submissions.length > 0 && (
          <RecentSubmissionsCard
            submissions={recentSubmissions.submissions.slice(0, 5)}
            loadedSubmissionId={loadedSubmissionId}
            isLoadingDetail={isLoadingDetail}
            onLoad={handleListLoadClick}
          />
        )}

        {/* Confirm load dialog */}
        <ConfirmDialog
          open={showConfirmLoad}
          onOpenChange={setShowConfirmLoad}
          title="Reemplazar contenido del editor"
          description="El editor tiene contenido. ¿Deseas reemplazarlo con el contenido del envío seleccionado?"
          confirmLabel="Reemplazar"
          cancelLabel="Cancelar"
          variant="warning"
          onConfirm={handleConfirmLoad}
          isLoading={isLoadingDetail}
        />
      </div>
    </AppLayout>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}
