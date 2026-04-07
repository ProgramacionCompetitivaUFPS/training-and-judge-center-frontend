import { ReactNode } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BreadcrumbItem } from '@/components/layout/Breadcrumbs'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'

interface MetadataItem {
  label: string
  value: ReactNode
  icon?: React.ElementType
}

interface Section {
  title: string
  content: ReactNode
}

interface Tab {
  id: string
  label: string
  content: ReactNode
  badge?: number
}

// --- DetailHeader ---

interface DetailHeaderProps {
  title: string
  subtitle?: string
  badges?: Array<{ label: string; variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' }>
}

function DetailHeader({ title, subtitle, badges }: DetailHeaderProps) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-extrabold text-neutral-text-primary">
          {title}
        </h1>
        {badges && badges.length > 0 && (
          <div className="flex items-center gap-2">
            {badges.map((badge, index) => (
              <Badge key={index} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-neutral-text-muted">{subtitle}</p>
      )}
    </div>
  )
}

// --- DetailActions ---

interface DetailActionsProps {
  onEdit?: () => void
  onDelete?: () => void
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ElementType
    variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  }
  additionalActions?: Array<{
    label: string
    onClick: () => void
    icon?: React.ElementType
    variant?: 'default' | 'danger'
  }>
}

function DetailActions({ onEdit, onDelete, primaryAction, additionalActions }: DetailActionsProps) {
  const hasDropdown = onEdit || onDelete || (additionalActions && additionalActions.length > 0)

  return (
    <div className="flex items-center gap-2">
      {primaryAction && (
        <Button
          onClick={primaryAction.onClick}
          variant={primaryAction.variant || 'primary'}
          className="gap-2"
        >
          {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
          {primaryAction.label}
        </Button>
      )}

      {hasDropdown && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            {additionalActions?.map((action, index) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={action.onClick}
                  className={action.variant === 'danger' ? 'text-status-error' : ''}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </DropdownMenuItem>
              )
            })}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-status-error"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// --- DetailContent ---

interface DetailContentProps {
  metadata?: MetadataItem[]
  sections?: Section[]
  tabs?: Tab[]
  defaultTab?: string
}

function DetailContent({ metadata, sections, tabs, defaultTab }: DetailContentProps) {
  return (
    <>
      {metadata && metadata.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metadata.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={index}>
                    <div className="flex items-center gap-2 mb-1">
                      {Icon && <Icon className="h-4 w-4 text-neutral-text-muted" />}
                      <span className="text-sm text-neutral-text-muted">
                        {item.label}
                      </span>
                    </div>
                    <div className="font-semibold text-neutral-text-primary">
                      {item.value}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {tabs && tabs.length > 0 ? (
        <Tabs defaultValue={defaultTab || tabs[0].id}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                {tab.label}
                {tab.badge !== undefined && (
                  <Badge variant="primary" className="ml-1">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : sections && sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>{section.content}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </>
  )
}

// --- EntityDetailPage (main component) ---

interface EntityDetailPageProps {
  // Header
  title: string
  subtitle?: string
  badges?: Array<{ label: string; variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' }>
  breadcrumbs?: BreadcrumbItem[]

  // State
  isLoading?: boolean

  // Actions
  onEdit?: () => void
  onDelete?: () => void
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ElementType
    variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  }
  additionalActions?: Array<{
    label: string
    onClick: () => void
    icon?: React.ElementType
    variant?: 'default' | 'danger'
  }>

  // Metadata
  metadata?: MetadataItem[]

  // Content
  sections?: Section[]
  tabs?: Tab[]
  defaultTab?: string

  // Layout
  showSidebar?: boolean
  maxWidth?: 'full' | 'container' | 'narrow'
}

export function EntityDetailPage({
  title,
  subtitle,
  badges,
  breadcrumbs,
  isLoading = false,
  onEdit,
  onDelete,
  primaryAction,
  additionalActions,
  metadata,
  sections,
  tabs,
  defaultTab,
  showSidebar = true,
  maxWidth = 'container',
}: EntityDetailPageProps) {
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
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <DetailHeader title={title} subtitle={subtitle} badges={badges} />
          <DetailActions
            onEdit={onEdit}
            onDelete={onDelete}
            primaryAction={primaryAction}
            additionalActions={additionalActions}
          />
        </div>
        <DetailContent
          metadata={metadata}
          sections={sections}
          tabs={tabs}
          defaultTab={defaultTab}
        />
      </div>
    </AppLayout>
  )
}
