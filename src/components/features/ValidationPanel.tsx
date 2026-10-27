import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardCheck, Loader2, TriangleAlert, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { ValidationReportView } from '@/components/features/ValidationReportView'
import { problemKeys, useLatestValidation } from '@/hooks/api/useProblems'

interface ValidationPanelProps {
  slug: string
  /** A publish request of this page is in flight: show it as running even before the server answers. */
  isPublishing: boolean
}

/**
 * mm:ss since it was mounted: it only exists while a validation runs, so it starts at zero each time.
 * Computed from the start time, not by counting ticks: a background tab throttles the interval.
 */
function Elapsed() {
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((now - start) / 1000))
  return <>{`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}</>
}

/**
 * What happened with the last attempt to publish the problem. The result used to exist only in the
 * dialog that opens if the publish request ends while the page is still open; this card keeps it,
 * shows the validation as it runs, and picks it up again if the page was closed meanwhile.
 */
export function ValidationPanel({ slug, isPublishing }: ValidationPanelProps) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch, isRefetching } = useLatestValidation(slug, { polling: isPublishing })
  const running = isPublishing || (!!data?.found && !data.terminal)
  const finished = !running && !!data?.found && data.terminal
  const failed = finished && !data.passed
  // The worker reports an infrastructure failure as a failed attempt with only this message and no detail.
  const systemError =
    failed &&
    !data.compilationErrors &&
    !data.failedTestCases?.length &&
    !data.failedInputs?.length &&
    !!data.validationLogs?.some((log) => /internal error/i.test(log))

  // When a validation that was running ends, the worker may have just published the problem: refresh it.
  const wasRunning = useRef(false)
  useEffect(() => {
    if (wasRunning.current && !running) {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
    }
    wasRunning.current = running
  }, [running, slug, queryClient])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Última validación
        </CardTitle>
        {running ? (
          <Badge variant="warning">Validando</Badge>
        ) : finished && data.passed ? (
          <Badge variant="success">Pasó</Badge>
        ) : systemError ? (
          <Badge variant="warning">Error del sistema</Badge>
        ) : failed ? (
          <Badge variant="error">Falló</Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && !running && <p className="text-neutral-text-muted">Cargando…</p>}

        {isError && !data && !running && (
          <div className="space-y-2">
            <p className="text-status-error">No se pudo consultar la última validación.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} isLoading={isRefetching}>
              Reintentar
            </Button>
          </div>
        )}

        {running && (
          <div className="space-y-1" role="status">
            <p className="flex items-center gap-2 text-neutral-text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando el problema…{' '}
              <span className="font-mono text-neutral-text-muted">
                <Elapsed />
              </span>
            </p>
            <p className="text-xs text-neutral-text-muted">
              Compila el checker y el validador, corre cada solución contra todos los casos y comprueba que den la respuesta
              esperada. Puede tardar unos minutos y sigue aunque cierres esta pestaña: el resultado queda aquí.
            </p>
          </div>
        )}

        {!running && data && !data.found && (
          <p className="text-neutral-text-muted">
            Este problema todavía no se ha validado. Al pulsar «Publicar», el sistema compila el checker y el validador, corre
            cada solución de referencia contra todos los casos y comprueba que den la respuesta esperada; aquí quedará el
            resultado.
          </p>
        )}

        {finished && data.passed && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-status-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              La última validación pasó.
            </p>
            {data.validationSummary && (
              <ul className="list-disc list-inside text-neutral-text-primary">
                <li>{data.validationSummary.sampleCases} caso(s) de ejemplo y {data.validationSummary.secretCases} secreto(s)</li>
                <li>{data.validationSummary.solutionsTested} solución(es) de referencia probada(s)</li>
              </ul>
            )}
            <ValidationReportView validationLogs={data.validationLogs} />
          </div>
        )}

        {failed && !systemError && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-status-error">
              <XCircle className="h-4 w-4 shrink-0" />
              La última validación falló; el problema no se publicó. Corrige lo que sigue y vuelve a pulsar «Publicar».
            </p>
            <ValidationReportView
              compilationErrors={data.compilationErrors}
              failedTestCases={data.failedTestCases}
              failedInputs={data.failedInputs}
              validationLogs={data.validationLogs}
            />
          </div>
        )}

        {systemError && (
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-neutral-text-primary">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
              La validación no pudo terminar por un error del sistema, no por el problema. Vuelve a pulsar «Publicar»; si se
              repite, avisa a un administrador.
            </p>
            <ValidationReportView validationLogs={data.validationLogs} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
