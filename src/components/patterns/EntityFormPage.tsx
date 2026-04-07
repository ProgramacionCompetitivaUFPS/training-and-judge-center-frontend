import { ReactNode, FormEvent } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BreadcrumbItem } from '@/components/layout/Breadcrumbs'
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription } from '@/components/ui'
import { Save, X, Loader2 } from 'lucide-react'

interface EntityFormPageProps {
  // Header
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  
  // Form
  children: ReactNode
  onSubmit: (e: FormEvent) => void | Promise<void>
  onCancel?: () => void
  
  // State
  isLoading?: boolean
  isSubmitting?: boolean
  error?: string
  
  // Actions
  submitLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  additionalActions?: ReactNode
  
  // Validation
  validationErrors?: Record<string, string>
  
  // Layout
  showSidebar?: boolean
  maxWidth?: 'full' | 'container' | 'narrow'
  
  // Sections
  sections?: Array<{
    title: string
    description?: string
    content: ReactNode
  }>
}

interface FormLayoutProps {
  title: string
  description?: string
  error?: string
  validationErrors?: Record<string, string>
  children: ReactNode
  onSubmit: (e: FormEvent) => void
  onCancel?: () => void
  isSubmitting: boolean
  submitLabel: string
  cancelLabel: string
  showCancel: boolean
  additionalActions?: ReactNode
  sections?: Array<{
    title: string
    description?: string
    content: ReactNode
  }>
}

function FormLayout({
  title,
  description,
  error,
  validationErrors,
  children,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
  cancelLabel,
  showCancel,
  additionalActions,
  sections,
}: FormLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-text-primary mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-neutral-text-muted">{description}</p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors && Object.keys(validationErrors).length > 0 && (
        <Alert variant="error">
          <AlertDescription>
            <p className="font-semibold mb-2">
              Por favor corrige los siguientes errores:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(validationErrors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={onSubmit}>
        {sections ? (
          // Sectioned Form
          <div className="space-y-6">
            {sections.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  {section.description && (
                    <p className="text-sm text-neutral-text-muted">
                      {section.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>{section.content}</CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Simple Form
          <Card>
            <CardContent className="pt-6">{children}</CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showCancel && onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    {cancelLabel}
                  </Button>
                )}
                {additionalActions}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {submitLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

export function EntityFormPage({
  title,
  description,
  breadcrumbs,
  children,
  onSubmit,
  onCancel,
  isLoading = false,
  isSubmitting = false,
  error,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  showCancel = true,
  additionalActions,
  validationErrors,
  showSidebar = false,
  maxWidth = 'narrow',
  sections,
}: EntityFormPageProps) {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(e)
  }

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbs={breadcrumbs}
        showSidebar={showSidebar}
        maxWidth={maxWidth}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      breadcrumbs={breadcrumbs}
      showSidebar={showSidebar}
      maxWidth={maxWidth}
    >
      <FormLayout
        title={title}
        description={description}
        error={error}
        validationErrors={validationErrors}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        showCancel={showCancel}
        additionalActions={additionalActions}
        sections={sections}
      >
        {children}
      </FormLayout>
    </AppLayout>
  )
}
