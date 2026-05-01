import React, { Suspense, useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Send, Upload, FileText, Clock, HardDrive, Lightbulb, UploadIcon } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { RecoveryBanner } from '@/components/features/RecoveryBanner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useContestSession } from '@/hooks/useContestSession'
import { useToastContext } from '@/hooks/useToastContext'
import { useProblemDetail } from '@/hooks/api/useProblems'
import { useMySubmissions, useSubmitSolution, useSubmitContestSolution, useSubmitBlocklySolution, useSubmitBlocklyContestSolution } from '@/hooks/api/useSubmissions'
import { useSubmissionRecovery } from '@/hooks/useSubmissionRecovery'
import { PROGRAMMING_LANGUAGES } from '@/lib/constants'
import { PyodideRunner } from '@/components/features/blockly/PyodideRunner'
import type { BlocklyEditorHandle } from '@/components/features/BlocklyEditor'

const BlocklyEditor = React.lazy(() => import('@/components/features/BlocklyEditor'))

const LANGUAGE_COMPILER_MAP: Record<string, string> = {
  cpp20: 'g++',
  java17: 'javac',
  python310: 'python3',
}

const LANGUAGE_EXTENSIONS: Record<string, { ext: string; accept: string[] }> = {
  cpp20: { ext: 'cpp', accept: ['.cpp', '.cc', '.cxx'] },
  java17: { ext: 'java', accept: ['.java'] },
  python310: { ext: 'py', accept: ['.py'] },
}

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function SubmitSolutionPage() {
  const { contestId } = useParams<{ contestId?: string }>()
  const [searchParams] = useSearchParams()
  const { toast } = useToastContext()
  const { contest: activeContest } = useContestSession()

  const isContestContext = !!contestId
  const problemParam = searchParams.get('problem') || ''

  // State
  const [selectedProblem, setSelectedProblem] = useState(problemParam)
  const [language, setLanguage] = useState('')
  const [code, setCode] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const blocklyRef = useRef<BlocklyEditorHandle>(null)
  const [isBlocklyEmpty, setIsBlocklyEmpty] = useState(true)

  // Resolve problem slug in contest context (letter → slug)
  const resolvedSlug = useMemo(() => {
    if (!isContestContext) return selectedProblem
    if (!activeContest?.problems) return ''
    const p = activeContest.problems.find(
      (prob) => (LABELS[prob.position - 1] || String(prob.position)) === selectedProblem.toUpperCase()
    )
    return p?.slug || ''
  }, [isContestContext, selectedProblem, activeContest])

  // Fetch problem detail for limits display
  const { data: problemDetail } = useProblemDetail(resolvedSlug || '')

  // Recent submissions for selected problem
  const { data: recentSubmissions } = useMySubmissions(
    resolvedSlug ? { problemSlug: resolvedSlug, limit: 5 } : undefined
  )

  // Submission recovery
  const isBlockly = language === 'blockly'

  const {
    recoverableSubmission,
    loadSubmission,
    submissionDetail,
    isLoadingDetail,
  } = useSubmissionRecovery({ problemSlug: resolvedSlug, language, contestId })

  const [showConfirmLoad, setShowConfirmLoad] = useState(false)
  const [loadedSubmissionId, setLoadedSubmissionId] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [pendingLoadSubmissionId, setPendingLoadSubmissionId] = useState<string | null>(null)
  const [pendingLoadLanguage, setPendingLoadLanguage] = useState<string | null>(null)

  // Reset banner when problem or language changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setBannerDismissed(false)
    setLoadedSubmissionId(null)
  }, [resolvedSlug, language])

  const hasEditorChanges = useCallback((): boolean => {
    if (isBlockly) return true // Blockly always has content (default or user blocks)
    return code.trim().length > 0
  }, [isBlockly, code])

  const applySubmissionToEditor = useCallback((detail: typeof submissionDetail) => {
    if (!detail) return

    const subIsBlockly = detail.language === 'blockly'

    if (subIsBlockly) {
      if (detail.workspaceXml) {
        blocklyRef.current?.loadXml(detail.workspaceXml)
      } else {
        toast({
          variant: 'warning',
          title: 'XML no disponible',
          description: 'Esta submission de Blockly no tiene workspaceXml. Solo está disponible el código Python como referencia.',
        })
        return
      }
    } else {
      setCode(detail.sourceCode)
    }

    toast({
      variant: 'success',
      title: 'Submission cargada',
      description: `Contenido cargado desde submission #${detail.id.slice(0, 8)}`,
    })
    setLoadedSubmissionId(detail.id)
    setBannerDismissed(true)
  }, [toast])

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
  }, [language, hasEditorChanges, loadSubmission])

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
  }, [pendingLoadSubmissionId, pendingLoadLanguage, loadSubmission, submissionDetail, applySubmissionToEditor])

  // Effect: apply loaded submission detail to editor when it arrives
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (showConfirmLoad) return // Don't apply while confirmation dialog is open
    if (!submissionDetail || !pendingLoadSubmissionId) return
    if (submissionDetail.id !== pendingLoadSubmissionId) return

    applySubmissionToEditor(submissionDetail)
    setPendingLoadSubmissionId(null)
  }, [submissionDetail, pendingLoadSubmissionId, showConfirmLoad, applySubmissionToEditor])

  // Mutations
  const submitMutation = useSubmitSolution()
  const contestSubmitMutation = useSubmitContestSolution()
  const blocklySubmitMutation = useSubmitBlocklySolution()
  const blocklyContestSubmitMutation = useSubmitBlocklyContestSolution()
  const isSubmitting = submitMutation.isPending || contestSubmitMutation.isPending || blocklySubmitMutation.isPending || blocklyContestSubmitMutation.isPending

  // Contest problems for selector
  const contestProblems = activeContest?.problems || []

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) {
      toast({ variant: 'error', title: 'Archivo muy grande', description: 'El límite es 1MB' })
      return
    }
    setUploadedFile({ name: file.name, size: file.size })
    // Auto-detect language
    if (!language) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      for (const [lang, config] of Object.entries(LANGUAGE_EXTENSIONS)) {
        if (config.accept.includes(ext)) {
          setLanguage(lang)
          break
        }
      }
    }
    // Read file content into textarea
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCode(ev.target?.result as string || '')
    }
    reader.readAsText(file)
  }

  const handleSubmit = () => {
    if (isBlockly) {
      const editor = blocklyRef.current
      if (!editor || !resolvedSlug) return

      const pythonCode = editor.getCode()
      const workspaceXml = editor.getXml()
      const svgBlob = editor.getSvg()

      const onSuccess = (res: { id: string }) => {
        toast({ variant: 'success', title: 'Solución enviada', description: `Submission ${res.id.slice(0, 12)} creada` })
      }
      const onError = () => {
        toast({ variant: 'error', title: 'Error', description: 'No se pudo enviar la solución' })
      }

      if (isContestContext && activeContest) {
        blocklyContestSubmitMutation.mutate(
          { groupId: activeContest.group.id, contestId: contestId!, problemSlug: resolvedSlug, pythonCode, workspaceXml, svgBlob },
          { onSuccess, onError },
        )
      } else {
        blocklySubmitMutation.mutate(
          { problemSlug: resolvedSlug, pythonCode, workspaceXml, svgBlob },
          { onSuccess, onError },
        )
      }
      return
    }

    if (!resolvedSlug || !language || !code.trim()) return

    const ext = LANGUAGE_EXTENSIONS[language]?.ext || 'txt'
    const file = new File([code], `solution.${ext}`, { type: 'text/plain' })
    const compiler = LANGUAGE_COMPILER_MAP[language] || language

    const onSuccess = (res: { id: string }) => {
      toast({ variant: 'success', title: 'Solución enviada', description: `Submission ${res.id.slice(0, 12)} creada` })
      setCode('')
      setUploadedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    const onError = () => {
      toast({ variant: 'error', title: 'Error', description: 'No se pudo enviar la solución' })
    }

    if (isContestContext && activeContest) {
      contestSubmitMutation.mutate(
        { groupId: activeContest.group.id, contestId: contestId!, problemSlug: resolvedSlug, file, language, compiler },
        { onSuccess, onError },
      )
    } else {
      submitMutation.mutate(
        { problemSlug: resolvedSlug, file, language, compiler },
        { onSuccess, onError },
      )
    }
  }

  const canSubmit = isBlockly
    ? (!!resolvedSlug && !isBlocklyEmpty && !isSubmitting)
    : (!!resolvedSlug && !!language && code.trim().length > 0 && !isSubmitting)

  const breadcrumbs = isContestContext
    ? [
        { label: 'Competencias', href: '/contests' },
        { label: activeContest?.name || 'Contest', href: `/contests/${contestId}` },
        { label: 'Enviar solución' },
      ]
    : [
        { label: 'Problemas', href: '/problems' },
        ...(problemDetail ? [{ label: problemDetail.title, href: `/problems/${problemDetail.slug}` }] : []),
        { label: 'Enviar solución' },
      ]

  const codeSize = new Blob([code]).size
  const codeSizeKB = (codeSize / 1024).toFixed(1)
  const isOverLimit = codeSize > 1024 * 1024

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
                  {isContestContext ? (
                    <Select value={selectedProblem} onValueChange={setSelectedProblem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar problema" />
                      </SelectTrigger>
                      <SelectContent>
                        {contestProblems.map((p) => {
                          const letter = LABELS[p.position - 1] || String(p.position)
                          return (
                            <SelectItem key={p.slug} value={letter}>
                              {letter} — {p.title}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedProblem} onValueChange={setSelectedProblem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Slug del problema" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* In practice mode, if we came from a problem, show it */}
                        {selectedProblem && problemDetail && (
                          <SelectItem value={selectedProblem}>{problemDetail.title}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Language selector */}
                <div>
                  <label className="block text-sm font-medium text-neutral-text-primary mb-2">Lenguaje</label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar lenguaje" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRAMMING_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            {problemDetail && (
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Límites del problema</p>
                  {(() => {
                    const override = language
                      ? problemDetail.languageOverrides.find((lo) => lo.language === language)
                      : undefined
                    const effectiveTime = override?.timeLimit ?? problemDetail.timeLimit
                    const effectiveMemory = override?.memoryLimit ?? problemDetail.memoryLimit
                    const hasTimeOverride = override?.timeLimit != null
                    const hasMemoryOverride = override?.memoryLimit != null
                    return (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-neutral-text-muted" />
                          <span className="text-neutral-text-primary">
                            {effectiveTime ? `${effectiveTime} ms` : 'No definido'}
                          </span>
                          {hasTimeOverride && (
                            <Badge variant="outline" className="text-[10px] py-0">override</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <HardDrive className="h-4 w-4 text-neutral-text-muted" />
                          <span className="text-neutral-text-primary">
                            {effectiveMemory ? `${effectiveMemory} MiB` : 'No definido'}
                          </span>
                          {hasMemoryOverride && (
                            <Badge variant="outline" className="text-[10px] py-0">override</Badge>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

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
              <>
                {resolvedSlug ? (
                  <>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          blocklyRef.current?.reset()
                          setLoadedSubmissionId(null)
                        }}
                      >
                        Reiniciar bloques
                      </Button>
                    </div>
                    <Suspense fallback={
                      <Card className="flex items-center justify-center" style={{ minHeight: 480 }}>
                        <CardContent>
                          <p className="text-neutral-text-muted">Cargando editor de bloques...</p>
                        </CardContent>
                      </Card>
                    }>
                      <BlocklyEditor
                        ref={blocklyRef}
                        problemSlug={resolvedSlug}
                        onEmptyChange={setIsBlocklyEmpty}
                      />
                    </Suspense>
                  </>
                ) : (
                  <Card className="flex items-center justify-center" style={{ minHeight: 480 }}>
                    <CardContent>
                      <p className="text-neutral-text-muted">Selecciona un problema para usar el editor de bloques</p>
                    </CardContent>
                  </Card>
                )}
                {resolvedSlug && <PyodideRunner getCode={() => blocklyRef.current?.getCode() ?? ''} />}
              </>
            ) : (
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
                      {codeSizeKB} KB / 1 MB
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Cargar archivo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".cpp,.cc,.cxx,.java,.py"
                      onChange={handleFileUpload}
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <Textarea
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value)
                      setUploadedFile(null)
                    }}
                    placeholder="Pega tu código aquí..."
                    className="font-mono text-sm min-h-[400px] resize-y bg-neutral-background"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent submissions */}
        {resolvedSlug && recentSubmissions && recentSubmissions.submissions.length > 0 && (
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
                  {recentSubmissions.submissions.slice(0, 5).map((sub) => (
                    <tr key={sub.id} className="border-b border-neutral-border last:border-0 hover:bg-neutral-background/50">
                      <td className="py-2 px-4">
                        <Link
                          to={`/submissions/${sub.id}`}
                          className="font-mono text-brand-primary hover:underline"
                        >
                          {sub.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2 px-4 text-neutral-text-muted">
                        {formatRelativeTime(sub.submittedAt)}
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" className="text-xs">{sub.language}</Badge>
                      </td>
                      <td className="py-2 px-4">
                        <SubmissionStatusBadge status={sub.status} />
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-text-muted">
                        {sub.memoryUsed != null ? `${sub.memoryUsed} KB` : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleListLoadClick(sub.id, sub.language)}
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
        )}

        {/* Confirm load dialog */}
        <ConfirmDialog
          open={showConfirmLoad}
          onOpenChange={setShowConfirmLoad}
          title="Reemplazar contenido del editor"
          description="El editor tiene contenido. ¿Deseas reemplazarlo con el contenido de la submission seleccionada?"
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
