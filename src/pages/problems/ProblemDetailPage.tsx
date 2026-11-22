import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, HardDrive, User, Calendar, Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, BarChart3, Send, Upload, X, RefreshCw, ClipboardCheck, HelpCircle, XCircle, Download, MoreVertical, Eye, AlertTriangle, Globe, Lock } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import {
  Badge, Button, LinkButton, Card, CardContent, CardHeader, CardTitle, SearchSelect, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
  Tabs, TabsList, TabsTrigger, TabsContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  UploadProgressBar,
  RotatingStatus,
} from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { CopyButton } from '@/components/features/CopyButton'
import { MarkdownRenderer } from '@/components/features/MarkdownRenderer'
import { ValidationPanel } from '@/components/features/ValidationPanel'
import { ValidationReportView } from '@/components/features/ValidationReportView'
import { PublishChecklist, type PublishChecklistStep } from '@/components/features/PublishChecklist'
import { useContestSession } from '@/hooks/useContestSession'
import { useToastContext } from '@/hooks/useToastContext'
import {
  useProblemDetail,
  useProblemStatistics,
  usePublishProblem,
  useValidateProblem,
  useLatestValidation,
  useProblemTestCases,
  useUnpublishProblem,
  useUpdateAccessibility,
  useDeleteProblem,
  useUploadProblemFile,
  useIsUploadingProblemFile,
  useUploadProgress,
  useDeleteProblemFile,
  useAddModifier,
  useRemoveModifier,
  useAdminRejudgeProblem,
  useExportProblem,
} from '@/hooks/api/useProblems'
import { useAuth } from '@/hooks/useAuth'
import { useRejudgeContestProblem } from '@/hooks/api/useContests'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useSearchUsers } from '@/hooks/api/useUsers'
import { useDebounce } from '@/hooks/useDebounce'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { SUBMISSION_STATUS_CONFIG, PATHS, PROBLEM_FILE_TYPE_INFO, ZIP_CHECK_PHRASES } from '@/lib/constants'
import { ApiClientError, isNotFoundError } from '@/lib/errors'
import { problemLabel } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errorMessages'
import { exceedsZipStructureCheckSize, peekZipEntryPaths } from '@/lib/zipPeek'
import type { ProblemAccessibility, ProblemDetail, PublishFailureResponse, ValidationSummary, LatestValidation } from '@/types/problem'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { ErrorPage } from '@/pages/errors/ErrorPage'

interface PublishRequirement { key: string; label: string; met: (problem: ProblemDetail) => boolean }

// Mirrors the backend's requiredFieldsForPublish (checker/validator are optional there,
// so they're intentionally left out here too). `key` matches the strings the backend sends
// back in a failed publish response's `missingFields` (see PublishFailureResponse).
const PUBLISH_REQUIREMENTS: PublishRequirement[] = [
  { key: 'statement', label: 'Enunciado', met: (p) => !!p.statement },
  { key: 'timeLimit', label: 'Límite de tiempo', met: (p) => p.timeLimit != null },
  { key: 'memoryLimit', label: 'Límite de memoria', met: (p) => p.memoryLimit != null },
  { key: 'testCases', label: 'Casos de prueba', met: (p) => !!p.files?.testCases },
  { key: 'solution', label: 'Al menos una solución', met: (p) => (p.files?.solutions.length ?? 0) > 0 },
]

function publishRequirementLabel(fieldKey: string): string {
  return PUBLISH_REQUIREMENTS.find((r) => r.key === fieldKey)?.label ?? fieldKey
}

type ActiveContest = ReturnType<typeof useContestSession>['contest']
type ContestGroup = ReturnType<typeof useGroupDetail>['data']
type AuthUser = ReturnType<typeof useAuth>['user']
type Statistics = NonNullable<ReturnType<typeof useProblemStatistics>['data']>
type PublishResult =
  | { kind: 'success'; validationLogs: string[]; validationSummary?: ValidationSummary }
  | { kind: 'failure'; data: PublishFailureResponse }

// ───────────────────────────── pure rules ─────────────────────────────

interface ProblemPermissions {
  isAdmin: boolean
  canEdit: boolean
  canDelete: boolean
  canSeeManagement: boolean
  isContestOwnerOrLead: boolean
  isContestLead: boolean
  showManagementTabs: boolean
}

/**
 * Who can do what with the problem. `isContestOwnerOrLead` is the real leadership of the contest's group, or
 * ownership of the contest itself — the two identities the backend's contest-scoped rejudge endpoint actually
 * accepts (same rule as ContestDetailPage.tsx). An Admin who is neither still sees the button (manual grants
 * Admin access too) but must be routed to the admin rejudge endpoint instead — see handleContestRejudge.
 */
function permissionsOf(
  problem: ProblemDetail,
  user: AuthUser,
  isContestContext: boolean,
  contestGroup: ContestGroup,
  activeContest: ActiveContest,
): ProblemPermissions {
  const isAdmin = user?.role === 'ADMIN'
  const isModifier = !!problem.modifiers?.some((m) => m.nickname === user?.nickname)
  const canEdit = isAdmin || isModifier
  const isContestOwnerOrLead =
    contestGroup?.userMembership.role === 'LEAD' || activeContest?.owner.nickname === user?.nickname
  return {
    isAdmin,
    canEdit,
    canDelete: isAdmin || problem.author.nickname === user?.nickname,
    canSeeManagement: user?.role === 'ADMIN' || user?.role === 'COACH',
    isContestOwnerOrLead,
    isContestLead: isAdmin || isContestOwnerOrLead,
    showManagementTabs: canEdit && !isContestContext,
  }
}

type CasesCount = { sampleCount: number; secretCount: number }

function testCasesWarningOf(counts: CasesCount | undefined): string | undefined {
  if (!counts) return undefined
  if (counts.secretCount === 0 && counts.sampleCount === 0) return 'Los casos de prueba no tienen pares completos (.in + .ans) aún.'
  if (counts.secretCount === 0) return 'No hay casos secretos: el juez evaluará solo con los ejemplos que los concursantes conocen.'
  if (counts.sampleCount === 0) return 'No hay ejemplos: los concursantes no verán ningún ejemplo en el enunciado.'
  return undefined
}

/** What the last validation says about the problem as it is now. */
function validationFlagsOf(validation: LatestValidation | undefined) {
  const finished = !!validation?.found && validation.terminal
  return {
    inProgress: !!validation?.found && !validation.terminal,
    failed: finished && !validation.passed,
    // A pass only counts while the problem is as it was when it ran; the server says when it is not.
    stale: finished && validation.passed && !!validation.stale,
    passed: finished && validation.passed && !validation.stale,
  }
}
type ValidationFlags = ReturnType<typeof validationFlagsOf>

function validateStepHint(requirementsMet: boolean, running: boolean, flags: ValidationFlags): string {
  if (!requirementsMet) return 'Antes completa los pasos de arriba'
  if (running) return 'Validando… puede tardar unos minutos'
  if (flags.failed) return 'La última validación falló.'
  if (flags.stale) return 'Cambiaste el problema después de validarlo.'
  return 'Compila todo y lo prueba con tus soluciones.'
}

interface ChecklistDeps {
  problem: ProblemDetail
  flags: ValidationFlags
  validationRunning: boolean
  testCasesWarning: string | undefined
  isUploadingFile: boolean
  goToEdit: () => void
  goToFiles: () => void
  requestUpload: (fileType: ProblemFileType) => void
  onValidate: () => void
}

/**
 * The five backend requirements as the author thinks of them: both limits are set in the same
 * form, so they're one step. A step is done when every requirement it covers is met.
 */
function buildChecklistSteps(deps: ChecklistDeps): { steps: PublishChecklistStep[]; requirementsMet: boolean } {
  const { problem, flags, testCasesWarning, goToEdit } = deps
  const metKeys = new Set(PUBLISH_REQUIREMENTS.filter((r) => r.met(problem)).map((r) => r.key))
  const requirementsMet = PUBLISH_REQUIREMENTS.every((r) => r.met(problem))
  const steps: PublishChecklistStep[] = [
    { key: 'statement', label: 'Enunciado', met: metKeys.has('statement'), hint: 'Aún no tiene enunciado', actionLabel: 'Editar', onAction: goToEdit },
    {
      key: 'limits', label: 'Límites de tiempo y memoria', met: metKeys.has('timeLimit') && metKeys.has('memoryLimit'),
      hint: 'Falta definir alguno', actionLabel: 'Editar', onAction: goToEdit,
    },
    {
      key: 'testCases', label: 'Casos de prueba', met: metKeys.has('testCases'), hint: 'No hay ninguno', actionLabel: 'Subir',
      onAction: () => deps.requestUpload('testCases'), warning: testCasesWarning, disabled: deps.isUploadingFile,
    },
    {
      key: 'solution', label: 'Al menos una solución', met: metKeys.has('solution'), hint: 'No hay ninguna', actionLabel: 'Agregar',
      onAction: () => deps.requestUpload('solution'), disabled: deps.isUploadingFile,
    },
    {
      key: 'validate',
      label: 'Validación',
      met: flags.passed,
      hint: validateStepHint(requirementsMet, deps.validationRunning, flags),
      actionLabel: flags.failed ? 'Reintentar' : 'Validar',
      onAction: deps.onValidate,
      disabled: !requirementsMet,
      loading: deps.validationRunning,
      onDetail: flags.failed ? deps.goToFiles : undefined,
    },
  ]
  return { steps, requirementsMet }
}

interface PublishDialogTextDeps {
  warnings: (string | undefined)[]
  testCasesUnchecked: boolean
  testCasesError: boolean
}

/** What the confirmation before publishing says: the checklist's warnings, or why the test cases are still unchecked. */
function publishDialogTextsOf({ warnings, testCasesUnchecked, testCasesError }: PublishDialogTextDeps) {
  if (warnings.length > 0) return { title: 'El problema tiene advertencias', description: warnings.join(' ') }
  if (!testCasesUnchecked) return { title: 'Publicar problema', description: 'Los casos de prueba ya se revisaron y no hay advertencias.' }
  return {
    title: 'Casos de prueba sin comprobar',
    description: testCasesError
      ? 'No se pudieron revisar los casos de prueba, así que no sabemos si faltan casos secretos o de ejemplo.'
      : 'Todavía se están revisando los casos de prueba, así que no sabemos si faltan casos secretos o de ejemplo.',
  }
}

// ───────────────────────────── data and actions (one hook per concern) ─────────────────────────────

/** Statistics, latest validation and test-case counts: what the sidebar and the checklist are built from. */
function useProblemReviewData(problem: ProblemDetail, slug: string, isContestContext: boolean, user: AuthUser) {
  const { data: stats } = useProblemStatistics(slug, problem.status === 'PUBLISHED')
  // Only an editor of a draft needs it: the checklist's last step and the Publicar button depend on it.
  const mayValidate =
    !isContestContext && problem.status === 'DRAFT' && (user?.role === 'ADMIN' || !!problem.modifiers?.some((m) => m.nickname === user?.nickname))
  const { data: validation } = useLatestValidation(slug, { enabled: mayValidate })
  const testCasesQueryEnabled = mayValidate && !!problem.files?.testCases
  const { data: testCasesData, isError: testCasesError } = useProblemTestCases(slug, testCasesQueryEnabled)
  return {
    stats,
    validation,
    testCasesError,
    // The query is on but has no answer yet (loading or failed): "unknown" is not "no warnings"
    testCasesUnchecked: testCasesQueryEnabled && !testCasesData,
    testCasesWarning: testCasesWarningOf(testCasesData),
  }
}

/** Validate and publish, and what the publish attempt answered (success logs or the failure detail). */
function usePublishFlow(problem: ProblemDetail, slug: string) {
  const { toast } = useToastContext()
  const publishMutation = usePublishProblem()
  const validateMutation = useValidateProblem()
  // Tied to the problem that opened it: the route reuses this component when :slug changes
  // (browser back), and a stale open flag would confirm the publication of the wrong problem.
  const [publishWarningSlug, setPublishWarningSlug] = useState<string | null>(null)
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null)

  const handleValidate = () => {
    validateMutation.mutate(problem.slug, {
      onError: (err) => toast({ variant: 'error', title: 'No se pudo validar', description: getErrorMessage(err) }),
    })
  }

  const handlePublish = () => {
    publishMutation.mutate(problem.slug, {
      onSuccess: (data) => {
        toast({ variant: 'success', title: 'Problema publicado' })
        if (data.validationLogs?.length) {
          setPublishResult({ kind: 'success', validationLogs: data.validationLogs, validationSummary: data.validationSummary })
        }
      },
      onError: (err) => {
        if (err instanceof ApiClientError && err.code === 'VALIDATION_FAILED' && err.raw) {
          toast({ variant: 'error', title: 'No se pudo publicar', description: 'Revisa el detalle de la validación.' })
          setPublishResult({ kind: 'failure', data: err.raw as PublishFailureResponse })
        } else {
          toast({ variant: 'error', title: 'Error al publicar', description: getErrorMessage(err) })
        }
      },
    })
  }

  /** With warnings (or test cases not checked yet) the author confirms first; otherwise it publishes. */
  const handlePublishClick = (needsConfirmation: boolean) => {
    if (needsConfirmation) setPublishWarningSlug(slug)
    else handlePublish()
  }

  return {
    isValidating: validateMutation.isPending,
    isPublishing: publishMutation.isPending,
    publishWarningOpen: !!slug && publishWarningSlug === slug,
    setPublishWarningOpen: (open: boolean) => setPublishWarningSlug(open ? slug : null),
    confirmPublishDespiteWarnings: () => {
      setPublishWarningSlug(null)
      handlePublish()
    },
    publishResult,
    closePublishResult: () => setPublishResult(null),
    handleValidate,
    handlePublishClick,
  }
}

/** Public/private: going private restricts who can see and add the problem, so it asks first; going public does not. */
function useAccessibilityChange(problem: ProblemDetail, slug: string) {
  const { toast } = useToastContext()
  const accessibilityMutation = useUpdateAccessibility()
  // Same idea as the publish warning: it must never confirm over a different problem
  const [makePrivateSlug, setMakePrivateSlug] = useState<string | null>(null)
  // Drop a stale confirmation as soon as another problem is shown, so coming back doesn't reopen it
  if (makePrivateSlug !== null && makePrivateSlug !== slug) setMakePrivateSlug(null)

  const changeAccessibility = (accessibility: ProblemAccessibility) => {
    accessibilityMutation.mutate(
      { slug: problem.slug, accessibility },
      {
        onSuccess: () =>
          toast({ variant: 'success', title: accessibility === 'PUBLIC' ? 'El problema ahora es público' : 'El problema ahora es privado' }),
        onError: (err) => toast({ variant: 'error', title: 'No se pudo cambiar la visibilidad', description: getErrorMessage(err) }),
        onSettled: () => setMakePrivateSlug(null),
      },
    )
  }

  return {
    isChanging: accessibilityMutation.isPending,
    makePrivateDialogOpen: !!slug && makePrivateSlug === slug,
    setMakePrivateOpen: (open: boolean) => setMakePrivateSlug(open ? slug : null),
    handleAccessibilityClick: () => {
      if (problem.accessibility === 'PUBLIC') setMakePrivateSlug(problem.slug)
      else changeAccessibility('PUBLIC')
    },
    handleMakePrivateConfirm: () => {
      // Only the problem that opened the confirmation may be changed by it
      if (makePrivateSlug !== problem.slug) return
      changeAccessibility('PRIVATE')
    },
  }
}

const ACTIVE_CONTEST_USE = 'Este problema está siendo usado en una competencia activa en este momento.'

/** Unpublish and delete, with their confirmations. */
function useRetireProblem(problem: ProblemDetail) {
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const unpublishMutation = useUnpublishProblem()
  const deleteMutation = useDeleteProblem()
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmSlug, setConfirmSlug] = useState('')

  const handleUnpublish = () => {
    unpublishMutation.mutate(problem.slug, {
      onSuccess: () => {
        toast({ variant: 'success', title: 'Problema despublicado' })
        setUnpublishDialogOpen(false)
      },
      onError: (err) => {
        if (err instanceof ApiClientError && err.code === 'PROBLEM_IN_ACTIVE_CONTEST') {
          toast({ variant: 'error', title: 'No se puede despublicar', description: ACTIVE_CONTEST_USE })
        } else {
          toast({ variant: 'error', title: 'Error al despublicar', description: getErrorMessage(err) })
        }
        setUnpublishDialogOpen(false)
      },
    })
  }

  const handleDelete = () => {
    if (confirmSlug !== problem.slug) return
    deleteMutation.mutate(
      { slug: problem.slug, data: { confirmSlug } },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Problema eliminado' })
          navigate('/problems')
        },
        onError: (err) => toast(deleteErrorToast(err)),
      },
    )
  }

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setConfirmSlug('')
  }

  return {
    isUnpublishing: unpublishMutation.isPending,
    isDeleting: deleteMutation.isPending,
    unpublishDialogOpen,
    setUnpublishDialogOpen,
    deleteDialogOpen,
    openDeleteDialog: () => setDeleteDialogOpen(true),
    closeDeleteDialog,
    confirmSlug,
    setConfirmSlug,
    switchToUnpublish: () => {
      closeDeleteDialog()
      setUnpublishDialogOpen(true)
    },
    handleUnpublish,
    handleDelete,
  }
}

function deleteErrorToast(err: unknown) {
  const code = err instanceof ApiClientError ? err.code : undefined
  if (code === 'PROBLEM_IN_ACTIVE_CONTEST') {
    return { variant: 'error' as const, title: 'No se puede eliminar', description: ACTIVE_CONTEST_USE }
  }
  if (code === 'PROBLEM_HAS_CONTEST_HISTORY') {
    return {
      variant: 'error' as const,
      title: 'No se puede eliminar',
      description: 'Tiene envíos hechos en una competencia: borrarlo cambiaría sus resultados. Despublícalo en su lugar.',
    }
  }
  return { variant: 'error' as const, title: 'Error al eliminar' }
}

interface RejudgeDeps {
  problem: ProblemDetail
  groupId: string | undefined
  contestId: string | undefined
  isContestOwnerOrLead: boolean
}

/** Rejudge: global (Admin) or inside a contest (owner/lead, or Admin through the admin endpoint). */
function useRejudge({ problem, groupId, contestId, isContestOwnerOrLead }: RejudgeDeps) {
  const { toast } = useToastContext()
  const adminRejudgeMutation = useAdminRejudgeProblem()
  const rejudgeContestMutation = useRejudgeContestProblem()
  const [adminRejudgeDialogOpen, setAdminRejudgeDialogOpen] = useState(false)
  const [contestRejudgeDialogOpen, setContestRejudgeDialogOpen] = useState(false)

  const handleAdminRejudge = () => {
    adminRejudgeMutation.mutate(
      { slug: problem.slug },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Rejuzgamiento global iniciado', description: 'Se están rejuzgando todos los envíos de este problema.' }),
        onError: (err) => toast({ variant: 'error', title: 'Error al rejuzgar', description: getErrorMessage(err) }),
      },
    )
    setAdminRejudgeDialogOpen(false)
  }

  const handleContestRejudge = () => {
    if (!groupId || !contestId) return
    const onSettled = {
      onSuccess: () => toast({ variant: 'success', title: 'Rejuzgamiento iniciado', description: 'Se están rejuzgando los envíos de este problema en la competencia.' }),
      onError: (err: unknown) => toast({ variant: 'error', title: 'Error al rejuzgar', description: getErrorMessage(err) }),
    }
    // An Admin who isn't the contest's owner/lead is rejected by the contest-scoped endpoint
    // (RejudgeContestSubmissionsUseCase only accepts owner/lead) — the admin endpoint with
    // ?contestId= is the one designed for that case (see PRB-09 in docs/seguimiento).
    if (isContestOwnerOrLead) {
      rejudgeContestMutation.mutate({ groupId, contestId, problemSlug: problem.slug }, onSettled)
    } else {
      adminRejudgeMutation.mutate({ slug: problem.slug, contestId }, onSettled)
    }
    setContestRejudgeDialogOpen(false)
  }

  return {
    isAdminRejudging: adminRejudgeMutation.isPending,
    isContestRejudging: rejudgeContestMutation.isPending || adminRejudgeMutation.isPending,
    adminRejudgeDialogOpen,
    setAdminRejudgeDialogOpen,
    contestRejudgeDialogOpen,
    setContestRejudgeDialogOpen,
    handleAdminRejudge,
    handleContestRejudge,
  }
}

function useExportProblemAction(problem: ProblemDetail) {
  const { toast } = useToastContext()
  const exportMutation = useExportProblem()
  return {
    isExporting: exportMutation.isPending,
    handleExport: () =>
      exportMutation.mutate(problem.slug, {
        onError: (err) => toast({ variant: 'error', title: 'No se pudo exportar el problema', description: getErrorMessage(err) }),
      }),
  }
}

// ───────────────────────────── presentational pieces ─────────────────────────────

function ExampleCard({ sample, index }: Readonly<{ sample: { name: string; input: string; output: string }; index: number }>) {
  return (
    <div className="border border-neutral-border rounded-lg overflow-hidden">
      <div className="bg-neutral-background px-4 py-2 border-b border-neutral-border">
        <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider">Ejemplo {index + 1}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Entrada</span>
            <CopyButton text={sample.input} label={`Copiar entrada del ejemplo ${index + 1}`} />
          </div>
          <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3 overflow-x-auto">{sample.input}</pre>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Salida</span>
            <CopyButton text={sample.output} label={`Copiar salida del ejemplo ${index + 1}`} />
          </div>
          <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3 overflow-x-auto">{sample.output}</pre>
        </div>
      </div>
    </div>
  )
}

/** The reader's view: statement and examples. */
function ProblemContent({ problem }: Readonly<{ problem: ProblemDetail }>) {
  const isPublished = problem.status === 'PUBLISHED'
  return (
    <>
      {/* Statement — the "Enunciado" label is only useful while reviewing a draft
          alongside the Archivos/Gestión cards; once published, this is the only thing
          on the page and a contestant is just here to read the problem, so the label
          would be redundant chrome. */}
      <Card>
        {!isPublished && (
          <CardHeader>
            <CardTitle>Enunciado</CardTitle>
          </CardHeader>
        )}
        <CardContent className={isPublished ? 'pt-6' : undefined}>
          {problem.statement ? (
            <MarkdownRenderer content={problem.statement} variant="statement" />
          ) : (
            <p className="text-neutral-text-muted italic">Sin enunciado aún</p>
          )}
        </CardContent>
      </Card>

      {/* Examples — derived automatically from the data/sample/ test-case files (GetProblem's
          `samples` field), not authored by hand, so they can't drift from what's actually judged. */}
      {!!problem.samples?.length && (
        <Card>
          <CardHeader>
            <CardTitle>Ejemplos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {problem.samples.map((sample, index) => (
              <ExampleCard key={sample.name} sample={sample} index={index} />
            ))}
          </CardContent>
        </Card>
      )}
    </>
  )
}

function PublishButton({ problem, canPublish, missingRequirements, requirementsMet, validationStale, isPublishing, onClick }: Readonly<{
  problem: ProblemDetail
  canPublish: boolean
  missingRequirements: PublishRequirement[]
  requirementsMet: boolean
  validationStale: boolean
  isPublishing: boolean
  onClick: () => void
}>) {
  if (problem.status !== 'DRAFT') return null
  if (canPublish) {
    return (
      <Button variant="primary" className="gap-2" onClick={onClick} isLoading={isPublishing}>
        <ArrowUpCircle className="h-4 w-4" />
        Publicar
      </Button>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="block">
          <Button variant="primary" className="gap-2" disabled>
            <ArrowUpCircle className="h-4 w-4" />
            Publicar
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold text-neutral-text-primary">Falta completar antes de publicar:</p>
        <ul className="mt-1 list-disc list-inside">
          {missingRequirements.map((r) => <li key={r.label}>{r.label}</li>)}
          {requirementsMet && <li>{validationStale ? 'Validar de nuevo el problema' : 'Validar el problema'}</li>}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

interface ManagementMenuProps {
  problem: ProblemDetail
  isAdmin: boolean
  canDelete: boolean
  retire: ReturnType<typeof useRetireProblem>
  accessibility: ReturnType<typeof useAccessibilityChange>
  rejudge: ReturnType<typeof useRejudge>
  exporting: ReturnType<typeof useExportProblemAction>
  onEdit: () => void
}

function ManagementMenu({ problem, isAdmin, canDelete, retire, accessibility, rejudge, exporting, onEdit }: Readonly<ManagementMenuProps>) {
  const isPublic = problem.accessibility === 'PUBLIC'
  const isPublished = problem.status === 'PUBLISHED'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Más acciones" title="Más acciones">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* The edit form refuses a published problem, so say why here instead of leading to a dead end */}
        <DropdownMenuItem onClick={onEdit} disabled={isPublished}>
          <Pencil className="mr-2 h-4 w-4 shrink-0" />
          <span>
            Editar
            {isPublished && <span className="block text-xs text-neutral-text-muted">Despublica el problema para editarlo</span>}
          </span>
        </DropdownMenuItem>
        {/* Unlike editing, the backend lets this change while the problem is published: no need to unpublish first */}
        <DropdownMenuItem onClick={accessibility.handleAccessibilityClick} disabled={accessibility.isChanging}>
          {isPublic ? <Lock className="mr-2 h-4 w-4 shrink-0" /> : <Globe className="mr-2 h-4 w-4 shrink-0" />}
          <span>
            {isPublic ? 'Hacer privado' : 'Hacer público'}
            <span className="block text-xs text-neutral-text-muted">
              {isPublic
                ? 'Solo los modificadores podrán añadirlo a nuevas competencias'
                : 'Cualquier creador de competencias podrá añadirlo'}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exporting.handleExport} disabled={exporting.isExporting}>
          <Download className="mr-2 h-4 w-4 shrink-0" />
          <span>
            {exporting.isExporting ? 'Exportando…' : 'Exportar ZIP'}
            <span className="block text-xs text-neutral-text-muted">Formato ICPC, se puede volver a importar</span>
          </span>
        </DropdownMenuItem>
        {isPublished && (
          <DropdownMenuItem onClick={() => retire.setUnpublishDialogOpen(true)} disabled={retire.isUnpublishing}>
            <ArrowDownCircle className="mr-2 h-4 w-4 shrink-0" />
            Despublicar
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => rejudge.setAdminRejudgeDialogOpen(true)} disabled={rejudge.isAdminRejudging}>
            <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
            Rejuzgar (global)
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={retire.openDeleteDialog} className="text-status-error">
              <Trash2 className="mr-2 h-4 w-4 shrink-0" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MetadataCard({ problem }: Readonly<{ problem: ProblemDetail }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-widest text-neutral-text-muted">Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetadataRow icon={User} label="Autor" value={problem.author.name} />
        <MetadataRow icon={Clock} label="Tiempo límite" value={problem.timeLimit ? `${problem.timeLimit} ms` : 'No definido'} />
        <MetadataRow icon={HardDrive} label="Memoria" value={problem.memoryLimit ? `${problem.memoryLimit} MiB` : 'No definido'} />
        {problem.languageOverrides.length > 0 && (
          <div className="pt-2 mt-2 border-t border-neutral-border">
            <p className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider mb-2">Overrides por lenguaje</p>
            <div className="space-y-1.5">
              {problem.languageOverrides.map((lo) => (
                <div key={lo.language} className="flex items-center justify-between text-xs">
                  <Badge variant="outline" className="text-[10px] py-0">{lo.language}</Badge>
                  <span className="text-neutral-text-muted font-mono">
                    {[lo.timeLimit && `${lo.timeLimit}ms`, lo.memoryLimit && `${lo.memoryLimit}MiB`].filter(Boolean).join(' / ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <MetadataRow icon={Calendar} label="Creado" value={new Date(problem.createdAt).toLocaleDateString('es')} />
      </CardContent>
    </Card>
  )
}

const percentOf = (part: number, total: number) => Math.round((part / total) * 100)

function verdictBarColor(verdict: string) {
  if (verdict === 'ACCEPTED') return 'bg-status-success'
  if (verdict === 'WRONG_ANSWER' || verdict === 'RUNTIME_ERROR') return 'bg-status-error'
  return 'bg-status-warning'
}

function VerdictDistribution({ distribution, total }: Readonly<{ distribution: NonNullable<Statistics['verdictDistribution']>; total: number }>) {
  return (
    <div className="pt-3 border-t border-neutral-border">
      <h4 className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider mb-2">Veredictos</h4>
      <div className="space-y-1.5">
        {distribution.map((v) => {
          const config = SUBMISSION_STATUS_CONFIG[v.verdict as keyof typeof SUBMISSION_STATUS_CONFIG]
          const pct = percentOf(v.count, total)
          return (
            <div key={v.verdict} className="flex items-center gap-2 text-xs">
              <span className="w-20 truncate text-neutral-text-muted">{config?.label || v.verdict}</span>
              <div className="flex-1 h-1 bg-neutral-surface rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${verdictBarColor(v.verdict)}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right font-mono text-neutral-text-muted">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatsCard({ stats, uniqueUsers }: Readonly<{ stats: Statistics; uniqueUsers: NonNullable<Statistics['uniqueUsers']> }>) {
  const successRate = percentOf(uniqueUsers.solved, uniqueUsers.attempted)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-widest text-neutral-text-muted flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" />
          Estadísticas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-neutral-text-primary">{stats.totalSubmissions}</div>
            <div className="text-[10px] text-neutral-text-muted">Envíos</div>
          </div>
          <div>
            <div className="text-lg font-bold text-neutral-text-primary">{uniqueUsers.attempted}</div>
            <div className="text-[10px] text-neutral-text-muted">Intentaron</div>
          </div>
          <div>
            <div className="text-lg font-bold text-status-success">{uniqueUsers.solved}</div>
            <div className="text-[10px] text-neutral-text-muted">Resolvieron</div>
          </div>
        </div>

        {/* Success rate bar */}
        {uniqueUsers.attempted > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-text-muted">Tasa de éxito</span>
              <span className="font-mono font-bold">{successRate}%</span>
            </div>
            <div className="h-1.5 bg-neutral-surface rounded-full overflow-hidden">
              <div className="h-full bg-status-success rounded-full" style={{ width: `${successRate}%` }} />
            </div>
          </div>
        )}

        {stats.verdictDistribution && <VerdictDistribution distribution={stats.verdictDistribution} total={stats.totalSubmissions} />}

        {/* Acceptance by language */}
        {stats.acceptanceRateByLanguage && (
          <div className="pt-3 border-t border-neutral-border">
            <h4 className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider mb-2">Por lenguaje</h4>
            <div className="space-y-2">
              {stats.acceptanceRateByLanguage.map((lang) => {
                const rate = lang.usersAttempted > 0 ? percentOf(lang.usersAccepted, lang.usersAttempted) : 0
                return (
                  <div key={lang.language} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{lang.language}</span>
                    <span className="font-bold text-brand-primary">{rate}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface RouteContext {
  groupId: string | undefined
  contestId: string | undefined
  letter: string | undefined
}

function SubmitCard({ problem, route }: Readonly<{ problem: ProblemDetail; route: RouteContext }>) {
  const navigate = useNavigate()
  const { groupId, contestId, letter } = route
  const goSubmit = () => {
    if (groupId && contestId && letter) navigate(PATHS.contestSubmit(groupId, contestId, letter.toUpperCase()))
    else navigate(`/submit?problem=${problem.slug}`)
  }
  const goSubmissions = () => {
    if (groupId && contestId) navigate(`${PATHS.contestSubmissions(groupId, contestId)}?problem=${encodeURIComponent(problem.slug)}`)
    else navigate(PATHS.problemSubmissions(problem.slug))
  }
  return (
    <Card>
      <CardContent className="pt-6">
        <Button variant="primary" className="w-full gap-2" onClick={goSubmit}>
          <Send className="h-4 w-4" />
          Enviar solución
        </Button>
        <Button variant="outline" className="w-full gap-2 mt-2" onClick={goSubmissions}>
          <BarChart3 className="h-4 w-4" />
          Ver envíos
        </Button>
      </CardContent>
    </Card>
  )
}

function ContestManagementCard({ isLoading, onRejudge }: Readonly<{ isLoading: boolean; onRejudge: () => void }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-widest text-neutral-text-muted">Gestión de la competencia</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full gap-2" onClick={onRejudge} isLoading={isLoading}>
          <RefreshCw className="h-4 w-4" />
          Rejuzgar envíos
        </Button>
      </CardContent>
    </Card>
  )
}

function PublishResultDialog({ result, onClose }: Readonly<{ result: PublishResult | null; onClose: () => void }>) {
  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result?.kind === 'failure' ? (
              <>
                <XCircle className="h-5 w-5 text-status-error" />
                No se pudo publicar
              </>
            ) : (
              <>
                <ClipboardCheck className="h-5 w-5 text-status-success" />
                Detalle de la validación
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {result?.kind === 'success' && (
          <ul className="space-y-2">
            {result.validationLogs.map((log, i) => (
              <li key={i} className="text-sm text-neutral-text-primary">{log}</li>
            ))}
          </ul>
        )}

        {result?.kind === 'failure' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-text-primary">{result.data.message}</p>

            {!!result.data.missingFields?.length && (
              <div>
                <p className="text-sm font-semibold text-neutral-text-primary">Faltan campos requeridos:</p>
                <ul className="mt-1 list-disc list-inside text-sm text-neutral-text-primary">
                  {result.data.missingFields.map((field) => (
                    <li key={field}>{publishRequirementLabel(field)}</li>
                  ))}
                </ul>
              </div>
            )}

            <ValidationReportView
              compilationErrors={result.data.compilationErrors}
              failedTestCases={result.data.failedTestCases}
              failedInputs={result.data.failedInputs}
              validationLogs={result.data.validationLogs}
            />
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteProblemDialog({ problem, retire }: Readonly<{ problem: ProblemDetail; retire: ReturnType<typeof useRetireProblem> }>) {
  return (
    <Dialog
      open={retire.deleteDialogOpen}
      onOpenChange={(open) => {
        if (open) retire.openDeleteDialog()
        else retire.closeDeleteDialog()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar problema</DialogTitle>
          <DialogDescription>
            Esta acción es irreversible. Escribe <span className="font-mono font-semibold">{problem.slug}</span> para confirmar.
          </DialogDescription>
        </DialogHeader>
        {problem.status === 'PUBLISHED' && (
          <div className="rounded-md border border-status-warning/30 bg-status-warning/5 p-3 text-sm space-y-1" role="status">
            <p className="font-semibold text-neutral-text-primary">Este problema está publicado.</p>
            <p className="text-neutral-text-muted">
              Si eliminas, se borran sus archivos y se quita de las competencias donde esté. Si solo quieres que nadie más
              lo use, despublícalo: vuelve a borrador y conserva todo, y lo puedes publicar de nuevo cuando quieras.
              Si ya recibió envíos dentro de una competencia, no se puede eliminar: sus resultados dependen de él.
            </p>
            <Button variant="primary" size="sm" className="mt-2" onClick={retire.switchToUnpublish}>
              Despublicar en vez de eliminar
            </Button>
          </div>
        )}
        <Input
          label="Confirmar slug"
          value={retire.confirmSlug}
          onChange={(e) => retire.setConfirmSlug(e.target.value)}
          placeholder={problem.slug}
        />
        <DialogFooter>
          <Button variant="outline" onClick={retire.closeDeleteDialog}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={retire.handleDelete}
            isLoading={retire.isDeleting}
            disabled={retire.confirmSlug !== problem.slug}
          >
            {problem.status === 'PUBLISHED' ? 'Eliminar de todos modos' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProblemTitle({ problem, route, isContestContext, canSeeManagement }: Readonly<{
  problem: ProblemDetail
  route: RouteContext
  isContestContext: boolean
  canSeeManagement: boolean
}>) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-2xl font-extrabold text-neutral-text-primary">
          {isContestContext && route.letter && `${route.letter.toUpperCase()}. `}{problem.title}
        </h1>
        {!isContestContext && canSeeManagement && (
          <>
            <Badge variant={problem.status === 'PUBLISHED' ? 'success' : 'default'}>
              {problem.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
            </Badge>
            <Badge variant={problem.accessibility === 'PUBLIC' ? 'primary' : 'outline'}>
              {problem.accessibility === 'PUBLIC' ? 'Público' : 'Privado'}
            </Badge>
          </>
        )}
        {/* Letter badge removed — letter is now prefixed in the title */}
      </div>
      {!isContestContext && (
        <p className="text-sm text-neutral-text-muted font-mono">{problem.slug}</p>
      )}
    </div>
  )
}

function breadcrumbsOf(
  problem: ProblemDetail,
  route: RouteContext,
  contestGroup: ContestGroup,
  activeContest: ActiveContest,
) {
  const { groupId, contestId, letter } = route
  if (!contestId) return [{ label: 'Problemas', href: '/problems' }, { label: problem.title }]
  return [
    { label: 'Grupos', href: '/groups' },
    { label: contestGroup?.name || '...', href: groupId ? PATHS.group(groupId) : undefined },
    { label: activeContest?.name || 'Competencia', href: PATHS.contest(groupId || '', contestId) },
    { label: `Problema ${letter?.toUpperCase() || ''}` },
  ]
}

// ───────────────────────────── page ─────────────────────────────

/** The optional files (checker, validator) a problem does not have. */
function optionalFilesMissing(problem: ProblemDetail): string[] {
  if (!problem.files) return []
  return [...(problem.files.checker ? [] : ['checker']), ...(problem.files.validator ? [] : ['validador'])]
}

/**
 * A draft can't be published without test cases and a solution, and those live in the other
 * tab now, so say so on the tab instead of leaving a new author to look for them.
 */
function requiredFilesMissing(problem: ProblemDetail): boolean {
  return problem.status === 'DRAFT' && (!problem.files?.testCases || (problem.files?.solutions.length ?? 0) === 0)
}

interface ProblemBodyProps {
  showTabs: boolean
  showManagement: boolean
  tabParam: string | null
  onTabChange: (tab: string) => void
  missingFiles: boolean
  problemContent: ReactNode
  managementContent: ReactNode
}

function ProblemBody({ showTabs, showManagement, tabParam, onTabChange, missingFiles, problemContent, managementContent }: Readonly<ProblemBodyProps>) {
  if (!showTabs) {
    return (
      <>
        {problemContent}
        {/* Inside a contest only an Admin can reach this, and no tabs there */}
        {showManagement && managementContent}
      </>
    )
  }
  // Whoever edits the problem gets the reader's view (statement and examples, as a
  // contestant sees it) apart from the management cards, instead of one long page.
  return (
    <Tabs value={tabParam === 'files' ? 'files' : 'problem'} onValueChange={onTabChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="problem">Problema</TabsTrigger>
        <TabsTrigger value="files" className="gap-1.5">
          Archivos y colaboradores
          {missingFiles && (
            <span
              className="h-2 w-2 rounded-full bg-status-warning"
              role="img"
              aria-label="Faltan archivos por subir"
              title="Faltan archivos por subir"
            />
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="problem" className="mt-0 space-y-6">
        {problemContent}
      </TabsContent>
      <TabsContent value="files" className="mt-0 space-y-6">
        {managementContent}
      </TabsContent>
    </Tabs>
  )
}

interface ProblemDetailViewProps {
  problem: ProblemDetail
  /** Slug of the problem shown (in a contest, resolved from the problem's letter). */
  slug: string
  route: RouteContext
  activeContest: ActiveContest
  contestGroup: ContestGroup
}

function ProblemDetailView({ problem, slug, route, activeContest, contestGroup }: Readonly<ProblemDetailViewProps>) {
  const navigate = useNavigate()
  // Which tab is open lives in the URL, so a file page's "Volver" and the browser's back button land on it
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isContestContext = !!route.contestId
  const isContestActive = isContestContext && activeContest?.status === 'ACTIVE'
  const perms = permissionsOf(problem, user, isContestContext, contestGroup, activeContest)

  const review = useProblemReviewData(problem, slug, isContestContext, user)
  const publishing = usePublishFlow(problem, slug)
  const accessibility = useAccessibilityChange(problem, slug)
  const retire = useRetireProblem(problem)
  const rejudge = useRejudge({ problem, groupId: route.groupId, contestId: route.contestId, isContestOwnerOrLead: perms.isContestOwnerOrLead })
  const exporting = useExportProblemAction(problem)

  // The upload outlives FilesManager (tab switches unmount it), so its state comes from the mutation
  // cache; the ZIP structure check runs before the upload starts and is reported up by FilesManager.
  const isUploadMutating = useIsUploadingProblemFile(slug)
  const [isCheckingZip, setIsCheckingZip] = useState(false)
  // Set by the checklist's "Subir"/"Agregar" actions: FilesManager opens the matching file picker once, then clears it.
  const [pendingAutoUpload, setPendingAutoUpload] = useState<ProblemFileType | null>(null)

  const goToFiles = () => setSearchParams({ tab: 'files' }, { replace: true })
  const goToEdit = () => navigate(PATHS.problemEdit(problem.slug))

  const flags = validationFlagsOf(review.validation)
  const validationRunning = publishing.isValidating || publishing.isPublishing || flags.inProgress
  const { steps: checklistSteps, requirementsMet } = buildChecklistSteps({
    problem,
    flags,
    validationRunning,
    testCasesWarning: review.testCasesWarning,
    isUploadingFile: isUploadMutating || isCheckingZip,
    goToEdit,
    goToFiles,
    requestUpload: (fileType) => {
      goToFiles()
      setPendingAutoUpload(fileType)
    },
    onValidate: publishing.handleValidate,
  })
  const warnings = checklistSteps.filter((s) => s.met && s.warning).map((s) => s.warning)
  const hasWarnings = warnings.length > 0
  const publishDialogTexts = publishDialogTextsOf({
    warnings,
    testCasesUnchecked: review.testCasesUnchecked,
    testCasesError: review.testCasesError,
  })
  const showChecklist = perms.showManagementTabs && problem.status === 'DRAFT'
  const optionalMissing = optionalFilesMissing(problem)
  const missingFiles = requiredFilesMissing(problem)

  const publishChecklist = (className?: string) => (
    <PublishChecklist steps={checklistSteps} optionalMissing={optionalMissing} onOptionalAction={goToFiles} className={className} />
  )

  // Only Publicar stays in view, and only on a draft: it's the last step of the flow, so hiding it
  // would make a new author hunt for it (the tooltip says what's still missing). Everything else
  // lives in the menu so this doesn't grow with every new feature.
  const managementActions = (
    <div className="flex items-center gap-2 shrink-0">
      <PublishButton
        problem={problem}
        canPublish={requirementsMet && flags.passed}
        missingRequirements={PUBLISH_REQUIREMENTS.filter((r) => !r.met(problem))}
        requirementsMet={requirementsMet}
        validationStale={flags.stale}
        isPublishing={publishing.isPublishing}
        onClick={() => publishing.handlePublishClick(hasWarnings || review.testCasesUnchecked)}
      />
      <ManagementMenu
        problem={problem}
        isAdmin={perms.isAdmin}
        canDelete={perms.canDelete}
        retire={retire}
        accessibility={accessibility}
        rejudge={rejudge}
        exporting={exporting}
        onEdit={goToEdit}
      />
    </div>
  )

  const problemContent = <ProblemContent problem={problem} />

  const managementContent = (
    <>
      {/* Files: always readable; uploading and deleting only while it's a draft — the backend
          rejects changes to a published problem */}
      {problem.files && (
        <FilesManager
          problem={problem}
          readOnly={problem.status === 'PUBLISHED'}
          testCasesWarning={review.testCasesWarning}
          autoUpload={pendingAutoUpload}
          onAutoUploadConsumed={() => setPendingAutoUpload(null)}
          isUploading={isUploadMutating}
          isCheckingZip={isCheckingZip}
          onCheckingZipChange={setIsCheckingZip}
        />
      )}

      {/* What happened with the last publish attempt: persists, follows a running validation */}
      <ValidationPanel slug={problem.slug} isPublishing={publishing.isPublishing || publishing.isValidating} />

      {/* Modifiers (only for modifiers) */}
      <ModifiersManager problem={problem} canAdd={perms.canEdit} canRemove={perms.canDelete} canSearchUsers={user?.role === 'ADMIN' || user?.role === 'COACH'} />
    </>
  )

  const tags = isContestActive ? [] : problem.tags
  const uniqueUsers = review.stats?.uniqueUsers

  return (
    <TooltipProvider>
    <AppLayout breadcrumbs={breadcrumbsOf(problem, route, contestGroup, activeContest)}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* === Left Column: Content === */}
        <div className="space-y-6 min-w-0">
          {/* Tags above title — hidden during active contest to prevent spoilers */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {tags.map((tag) => (
                <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Title + badges, with the management actions on the right (up here so an author
              doesn't have to scroll the sidebar to find them) */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <ProblemTitle problem={problem} route={route} isContestContext={isContestContext} canSeeManagement={perms.canSeeManagement} />
            {perms.canEdit && !isContestContext && managementActions}
          </div>

          {/* On a phone the sidebar ends up at the bottom of the page, where nobody would see it */}
          {showChecklist && publishChecklist('lg:hidden')}

          <ProblemBody
            showTabs={perms.showManagementTabs}
            showManagement={perms.canEdit}
            tabParam={searchParams.get('tab')}
            onTabChange={(tab) => setSearchParams(tab === 'files' ? { tab: 'files' } : {}, { replace: true })}
            missingFiles={missingFiles}
            problemContent={problemContent}
            managementContent={managementContent}
          />
        </div>

        {/* === Right Column: Sidebar === */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          {/* Submit action */}
          {problem.status === 'PUBLISHED' && <SubmitCard problem={problem} route={route} />}

          {/* Technical metadata */}
          <MetadataCard problem={problem} />

          {showChecklist && publishChecklist('hidden lg:block')}

          {/* Statistics — hidden during active contest */}
          {!isContestActive && review.stats && review.stats.totalSubmissions > 0 && uniqueUsers && (
            <StatsCard stats={review.stats} uniqueUsers={uniqueUsers} />
          )}

          {/* Contest-scoped rejudge (only within a contest, for the group's real leads, the
              contest's owner, or Admin — see handleContestRejudge for the endpoint routing) */}
          {isContestContext && perms.isContestLead && (
            <ContestManagementCard isLoading={rejudge.isContestRejudging} onRejudge={() => rejudge.setContestRejudgeDialogOpen(true)} />
          )}
        </aside>
      </div>

      {/* Unpublish confirm. Caveat for maintainers: the backend only blocks unpublishing during an
          ACTIVE contest (unpublish_problem.go), so a scheduled one could start with a draft problem
          (PROBLEM_NOT_PUBLISHED). The real fix is listing the contests that use it (PRB-M04). */}
      <ConfirmDialog
        open={retire.unpublishDialogOpen}
        onOpenChange={retire.setUnpublishDialogOpen}
        title="Despublicar problema"
        description="El problema volverá a borrador y nadie podrá enviarle soluciones hasta que lo publiques de nuevo."
        variant="warning"
        confirmLabel="Despublicar"
        onConfirm={retire.handleUnpublish}
        isLoading={retire.isUnpublishing}
      />

      {/* Admin rejudge (global) confirm dialog */}
      <ConfirmDialog
        open={rejudge.adminRejudgeDialogOpen}
        onOpenChange={rejudge.setAdminRejudgeDialogOpen}
        title="Rejuzgar en toda la plataforma"
        description="Esta acción reevalúa todos los envíos de este problema en todas las competencias y en modo práctica. Puede tardar según la cantidad de envíos."
        variant="warning"
        confirmLabel="Rejuzgar"
        onConfirm={rejudge.handleAdminRejudge}
        isLoading={rejudge.isAdminRejudging}
      />

      {/* Contest rejudge confirm dialog */}
      <ConfirmDialog
        open={rejudge.contestRejudgeDialogOpen}
        onOpenChange={rejudge.setContestRejudgeDialogOpen}
        title="Rejuzgar envíos de este problema"
        description="Esta acción reevalúa todos los envíos afectados de este problema dentro de esta competencia."
        variant="warning"
        confirmLabel="Rejuzgar"
        onConfirm={rejudge.handleContestRejudge}
        isLoading={rejudge.isContestRejudging}
      />

      <ConfirmDialog
        open={accessibility.makePrivateDialogOpen}
        onOpenChange={accessibility.setMakePrivateOpen}
        title="Hacer privado el problema"
        description="Solo los modificadores podrán añadirlo a nuevas competencias, y los demás usuarios dejarán de verlo en el listado público. Las competencias que ya lo incluyen y los envíos existentes no se ven afectados."
        variant="warning"
        confirmLabel="Hacer privado"
        onConfirm={accessibility.handleMakePrivateConfirm}
        isLoading={accessibility.isChanging}
      />

      {/* Publish confirm when the checklist still carries warnings (non-blocking: the author decides) */}
      <ConfirmDialog
        open={publishing.publishWarningOpen}
        onOpenChange={publishing.setPublishWarningOpen}
        title={publishDialogTexts.title}
        description={publishDialogTexts.description}
        variant="warning"
        confirmLabel="Publicar de todas formas"
        onConfirm={publishing.confirmPublishDespiteWarnings}
      />

      {/* Publish validation result — success (validation logs) or failure (real detail from
          the backend: missing fields, failed test cases, compilation errors, rejected inputs) */}
      <PublishResultDialog result={publishing.publishResult} onClose={publishing.closePublishResult} />

      {/* Delete dialog */}
      <DeleteProblemDialog problem={problem} retire={retire} />
    </AppLayout>
    </TooltipProvider>
  )
}

export function ProblemDetailPage() {
  const { slug, groupId, contestId, letter } = useParams<{ slug: string; groupId?: string; contestId?: string; letter?: string }>()
  const { contest: activeContest, isLoading: isContestLoading } = useContestSession()

  const isContestContext = !!contestId
  const resolvedSlug = isContestContext
    ? activeContest?.problems.find(
        (p) => problemLabel(p.position) === letter?.toUpperCase()
      )?.slug
    : slug

  const { data: problem, isLoading, error } = useProblemDetail(resolvedSlug || '')
  const { data: contestGroup } = useGroupDetail(isContestContext ? groupId || '' : '')

  // A contest problem letter that doesn't exist (or a contest that can't be seen) resolves to no slug.
  if (isContestContext && !isContestLoading && !resolvedSlug) return <NotFoundPage />
  if (isNotFoundError(error)) return <NotFoundPage />

  if (isLoading || (isContestContext && (isContestLoading || !resolvedSlug))) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Problemas', href: '/problems' }, { label: '...' }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    )
  }

  if (error || !problem) return <ErrorPage />

  return (
    <ProblemDetailView
      problem={problem}
      slug={resolvedSlug ?? ''}
      route={{ groupId, contestId, letter }}
      activeContest={activeContest}
      contestGroup={contestGroup}
    />
  )
}

// === Sub-components ===

interface MetadataRowProps { icon: React.ElementType; label: string; value: string }

function MetadataRow({ icon: Icon, label, value }: MetadataRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-neutral-text-muted">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-neutral-text-primary">{value}</span>
    </div>
  )
}

type ProblemFileType = keyof typeof PROBLEM_FILE_TYPE_INFO

// Cheap sanity check, not a replacement for the backend's real parser (icpc_parser.go):
// only confirms the two required folders exist somewhere in the archive, without
// validating .in/.ans pairing, file sizes, or the exact ICPC root-detection rules —
// that stays the backend's job so the two don't drift out of sync.
async function checkTestCasesZipStructure(file: File): Promise<string | null> {
  const paths = await peekZipEntryPaths(file)
  if (!paths) return 'El archivo no se pudo leer como un ZIP válido.'
  const hasSample = paths.some((p) => p.includes('data/sample/'))
  const hasSecret = paths.some((p) => p.includes('data/secret/'))
  if (!hasSample || !hasSecret) {
    return 'El ZIP debe contener las carpetas data/sample/ y data/secret/ con los casos de prueba.'
  }
  return null
}

interface FilesManagerProps {
  problem: ProblemDetail
  readOnly?: boolean
  testCasesWarning?: string
  autoUpload?: ProblemFileType | null
  onAutoUploadConsumed?: () => void
  /** An upload of this problem is running, possibly one started before this component was mounted. */
  isUploading?: boolean
  /** The ZIP structure check (which runs before the upload starts) is in progress, possibly one started before this component was mounted. */
  isCheckingZip?: boolean
  /** Reports the ZIP structure check. Its state is owned by the parent: this component unmounts on tab switches. */
  onCheckingZipChange?: (checking: boolean) => void
}

function FilesManager({ problem, readOnly = false, testCasesWarning, autoUpload, onAutoUploadConsumed, isUploading = false, isCheckingZip = false, onCheckingZipChange }: FilesManagerProps) {
  const uploadMutation = useUploadProblemFile()
  const deleteMutation = useDeleteProblemFile()
  const { toast } = useToastContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFileType, setPendingFileType] = useState<ProblemFileType | null>(null)
  // From the mutation cache, not local state: the upload outlives this component (tab switches unmount it)
  const uploadProgress = useUploadProgress(problem.slug)
  const [deleteTarget, setDeleteTarget] = useState<{ fileType: string; fileName?: string; label: string } | null>(null)

  // Must stay above the early return below: the checklist sets autoUpload and switches to this tab.
  useEffect(() => {
    if (!autoUpload || readOnly) return
    triggerUpload(autoUpload)
    onAutoUploadConsumed?.()
    // triggerUpload and onAutoUploadConsumed are stable; readOnly is intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUpload])

  // Per-call onSettled can be dropped by TanStack Query if the component re-renders during the
  // mutation (e.g. the invalidation refetch lands before the callback fires). This effect is the
  // reliable fallback: it reacts to an active upload finishing regardless of callback timing.
  // It must not run on mount (isPending is already false): that would clear the pendingFileType the
  // checklist's autoUpload just set, and the file the user picks would be silently discarded.
  const wasPendingRef = useRef(false)
  useEffect(() => {
    if (uploadMutation.isPending) {
      wasPendingRef.current = true
      return
    }
    if (!wasPendingRef.current) return
    wasPendingRef.current = false
    setPendingFileType(null)
  }, [uploadMutation.isPending])

  if (!problem.files) return null
  const files = problem.files

  function triggerUpload(fileType: ProblemFileType) {
    setPendingFileType(fileType)
    if (fileInputRef.current) fileInputRef.current.accept = PROBLEM_FILE_TYPE_INFO[fileType].accept
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !pendingFileType) return

    const info = PROBLEM_FILE_TYPE_INFO[pendingFileType]
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!(info.extensions as readonly string[]).includes(extension)) {
      toast({
        variant: 'error',
        title: 'Formato de archivo incorrecto',
        description: `${info.label} espera ${info.extensions.join(' o ')}. ${info.help}`,
      })
      setPendingFileType(null)
      return
    }

    if (pendingFileType === 'testCases' && !exceedsZipStructureCheckSize(file)) {
      // Busy from the start of the check: otherwise the checklist stays enabled while it runs
      onCheckingZipChange?.(true)
      let structureError: string | null
      try {
        structureError = await checkTestCasesZipStructure(file)
      } finally {
        onCheckingZipChange?.(false)
      }
      if (structureError) {
        toast({ variant: 'error', title: 'Estructura del ZIP incorrecta', description: structureError })
        setPendingFileType(null)
        return
      }
    }

    uploadMutation.mutate(
      { slug: problem.slug, fileType: pendingFileType, file },
      { onSettled: () => setPendingFileType(null) },
    )
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(
      { slug: problem.slug, fileType: deleteTarget.fileType, fileName: deleteTarget.fileName },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Archivo eliminado' }),
        onError: (err) => {
          if (err instanceof ApiClientError && err.code === 'PROBLEM_IS_PUBLISHED') {
            toast({ variant: 'error', title: 'No se puede eliminar el archivo', description: 'Este problema está publicado. Despublícalo primero para modificar sus archivos.' })
          } else {
            toast({ variant: 'error', title: 'Error al eliminar el archivo' })
          }
        },
      },
    )
    setDeleteTarget(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {(['testCases', 'checker', 'validator'] as const).map((fileType) => (
          <div key={fileType}>
          <div className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${files[fileType] ? 'bg-status-success' : 'bg-neutral-border'}`} />
              <span className="text-neutral-text-primary inline-flex items-center gap-1">
                {PROBLEM_FILE_TYPE_INFO[fileType].label}
                <FileFormatHint fileType={fileType} />
              </span>
            </div>
            <div className="flex items-center gap-1">
              {files[fileType] && (
                <LinkButton
                  to={fileType === 'testCases' ? PATHS.problemTestCases(problem.slug) : PATHS.problemJudgingFile(problem.slug, fileType)}
                  variant="ghost"
                  size="sm"
                  aria-label={`Ver ${PROBLEM_FILE_TYPE_INFO[fileType].label}`}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver
                </LinkButton>
              )}
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerUpload(fileType)}
                  disabled={uploadMutation.isPending || isUploading || isCheckingZip}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {files[fileType] ? 'Reemplazar' : 'Subir'}
                </Button>
              )}
              {!readOnly && files[fileType] && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ fileType, label: PROBLEM_FILE_TYPE_INFO[fileType].label })}
                  className="p-1 rounded hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
                  aria-label={`Eliminar ${PROBLEM_FILE_TYPE_INFO[fileType].label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {fileType === 'testCases' && testCasesWarning && (
            <p className="text-xs text-status-warning flex items-center gap-1 pl-4 pb-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {testCasesWarning}
            </p>
          )}
          </div>
        ))}

        <div className="pt-2 border-t border-neutral-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-text-primary font-medium inline-flex items-center gap-1">
              Soluciones
              <FileFormatHint fileType="solution" />
            </span>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => triggerUpload('solution')}
                disabled={uploadMutation.isPending || isUploading || isCheckingZip}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Agregar
              </Button>
            )}
          </div>
          {files.solutions.length === 0 ? (
            <p className="text-xs text-neutral-text-muted">Sin soluciones cargadas.</p>
          ) : (
            <ul className="space-y-1">
              {files.solutions.map((sol) => (
                <li key={sol.filename} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-text-muted font-mono text-xs">{sol.filename}</span>
                  <div className="flex items-center gap-1">
                    <LinkButton
                      to={PATHS.problemSolutionFile(problem.slug, sol.filename)}
                      variant="ghost"
                      size="sm"
                      aria-label={`Ver ${sol.filename}`}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </LinkButton>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ fileType: 'solution', fileName: sol.filename, label: sol.filename })}
                        className="p-1 rounded hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
                        aria-label={`Eliminar ${sol.filename}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {readOnly && (
          <p className="pt-2 border-t border-neutral-border text-xs text-neutral-text-muted">
            Para subir o eliminar archivos, despublica el problema primero.
          </p>
        )}
        {isCheckingZip ? (
          <RotatingStatus phrases={ZIP_CHECK_PHRASES} className="mt-2" />
        ) : (
          <UploadProgressBar progress={uploadProgress} className="mt-2" />
        )}
      </CardContent>


      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar archivo"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.label}"? Esta acción no se puede deshacer.`}
        variant="warning"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  )
}

function FileFormatHint({ fileType }: { fileType: ProblemFileType }) {
  const info = PROBLEM_FILE_TYPE_INFO[fileType]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="align-super text-neutral-text-muted hover:text-brand-primary"
          aria-label={`Formato esperado para ${info.label}`}
        >
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{info.help}</p>
        <pre className="mt-1.5 whitespace-pre-wrap rounded bg-neutral-background p-1.5 font-mono text-[11px] text-neutral-text-muted">
          {info.example}
        </pre>
      </TooltipContent>
    </Tooltip>
  )
}

interface ModifiersManagerProps {
  problem: ProblemDetail
  /** Whoever can edit the problem can bring in more collaborators; the backend answers 403 to anyone else */
  canAdd: boolean
  /** Removing a collaborator stays with the author and Admin */
  canRemove: boolean
  canSearchUsers: boolean
}

function ModifiersManager({ problem, canAdd, canRemove, canSearchUsers }: ModifiersManagerProps) {
  const addMutation = useAddModifier()
  const removeMutation = useRemoveModifier()
  const { toast } = useToastContext()
  const [userQuery, setUserQuery] = useState('')
  const debouncedUserQuery = useDebounce(userQuery)
  const { data: userSearchData, isFetching: isSearchingUsers } = useSearchUsers(debouncedUserQuery, undefined, canSearchUsers && canAdd)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const modifiers = problem.modifiers ?? []

  function handleAdd(targetNickname: string) {
    addMutation.mutate(
      { slug: problem.slug, userNickname: targetNickname },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Colaborador agregado' })
          setUserQuery('')
        },
        onError: (err) => toast({ variant: 'error', title: 'Error al agregar colaborador', description: getErrorMessage(err) }),
      },
    )
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return
    removeMutation.mutate(
      { slug: problem.slug, nickname: removeTarget },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Colaborador removido' }),
        onError: (err) => toast({ variant: 'error', title: 'Error al remover colaborador', description: getErrorMessage(err) }),
      },
    )
    setRemoveTarget(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modificadores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canAdd ? (
        <SearchSelect
          query={userQuery}
          onQueryChange={setUserQuery}
          results={(userSearchData?.users ?? []).filter((u) => !modifiers.some((m) => m.nickname === u.nickname))}
          isSearching={isSearchingUsers}
          placeholder="Buscar usuario por nombre o nickname..."
          emptyLabel="Sin resultados (o ya es colaborador)"
          hintLabel="Escribe al menos 2 caracteres"
          getKey={(u) => u.id}
          renderItem={(u) => (
            <div>
              <p className="font-medium text-neutral-text-primary">{u.name}</p>
              <p className="text-xs text-neutral-text-muted">@{u.nickname}</p>
            </div>
          )}
          onSelect={(u) => handleAdd(u.nickname)}
        />
        ) : (
          <p className="text-xs text-neutral-text-muted">Solo quien puede editar este problema puede agregar colaboradores.</p>
        )}
        {addMutation.isPending && <p className="text-xs text-neutral-text-muted">Agregando...</p>}
        {modifiers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {modifiers.map((m) => (
              <Badge key={m.nickname} variant="outline" className="gap-1 pr-1">
                {m.name} (@{m.nickname})
                {/* The author keeps editing rights whatever the list says, so a "×" on them does nothing useful */}
                {canRemove && m.nickname !== problem.author.nickname && (
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(m.nickname)}
                    className="ml-1 p-0.5 rounded-full hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
                    aria-label={`Quitar a ${m.nickname}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        {canAdd && !canRemove && (
          <p className="text-xs text-neutral-text-muted">Solo el autor y los administradores pueden quitar colaboradores.</p>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Quitar colaborador"
        description={`¿Seguro que quieres quitar a @${removeTarget} como colaborador de este problema?`}
        variant="warning"
        onConfirm={handleRemoveConfirm}
        isLoading={removeMutation.isPending}
      />
    </Card>
  )
}

