import { SUBMISSION_STATUS_CONFIG } from '@/lib/constants'
import type { CompilationErrors, FailedInput, FailedTestCase } from '@/types/problem'

interface ValidationReportViewProps {
  compilationErrors?: CompilationErrors
  failedTestCases?: FailedTestCase[]
  failedInputs?: FailedInput[]
  validationLogs?: string[]
}

// Collapsed behind a <details> and scrollable, so a long output neither buries the report nor gets cut:
// a mismatch can sit past any fixed number of characters.
const OUTPUT_CLASS = 'max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-background p-2 font-mono text-xs'

const verdictLabel = (value: string) => SUBMISSION_STATUS_CONFIG[value as keyof typeof SUBMISSION_STATUS_CONFIG]?.label ?? value

/**
 * What a failed validation found, step by step: what did not compile, which test cases failed and
 * how, which inputs the validator rejected, and the full log. Shared by the publish dialog and the
 * "Última validación" card.
 */
export function ValidationReportView({ compilationErrors, failedTestCases, failedInputs, validationLogs }: ValidationReportViewProps) {
  return (
    <div className="space-y-4">
      {compilationErrors && (
        <div>
          <p className="text-sm font-semibold text-neutral-text-primary">
            Error de compilación en <span className="font-mono">{compilationErrors.file}</span>:
          </p>
          <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-neutral-background p-2 font-mono text-xs text-neutral-text-primary">
            {compilationErrors.errors.join('\n')}
          </pre>
        </div>
      )}

      {!!failedTestCases?.length && (
        <div>
          <p className="text-sm font-semibold text-neutral-text-primary">Casos de prueba fallidos:</p>
          <ul className="mt-1 space-y-2 text-sm text-neutral-text-primary">
            {failedTestCases.map((tc) => {
              const verdict = tc.status || tc.verdict
              return (
                <li key={tc.case}>
                  <span className="font-mono">{tc.case}</span>
                  {verdict && <span className="text-neutral-text-muted"> — {verdictLabel(verdict)}</span>}
                  {tc.details && <span className="block text-xs text-neutral-text-muted">{tc.details}</span>}
                  {(tc.expected || tc.actual) && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-neutral-text-muted">Ver respuesta esperada y obtenida</summary>
                      <div className="mt-1 grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-neutral-text-muted">Esperada</p>
                          <pre className={OUTPUT_CLASS}>{tc.expected ?? ''}</pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-text-muted">Obtenida</p>
                          <pre className={OUTPUT_CLASS}>{tc.actual ?? ''}</pre>
                        </div>
                      </div>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!!failedInputs?.length && (
        <div>
          <p className="text-sm font-semibold text-neutral-text-primary">Entradas rechazadas por el validador:</p>
          <ul className="mt-1 space-y-1 text-sm text-neutral-text-primary">
            {failedInputs.map((fi) => (
              <li key={fi.file}>
                <span className="font-mono">{fi.file}</span>: {fi.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!validationLogs?.length && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-neutral-text-primary">Ver logs completos</summary>
          <ul className="mt-2 space-y-1">
            {validationLogs.map((log, i) => (
              <li key={i} className="text-sm text-neutral-text-primary">
                {log}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
