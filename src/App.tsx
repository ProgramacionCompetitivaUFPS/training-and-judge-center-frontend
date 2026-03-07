import { useState } from 'react'
import { ToastProvider, useToastContext } from './components/ui/ToastProvider'
import { DashboardPage } from './pages/DashboardPage'
import { ProblemsPage } from './pages/ProblemsPage'
import { ProblemDetailPage } from './pages/ProblemDetailPage'
import { Button } from './components/ui'
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from './components/ui'

function ComponentsDemo() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const { toast } = useToastContext()

  return (
    <div className="min-h-screen bg-neutral-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-neutral-text-primary">
            Training & Judge Center - Component Library
          </h1>
          <p className="text-neutral-text-muted">
            Sistema de componentes basado en design tokens
          </p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Diferentes variantes y tamaños de botones</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" isLoading>Loading</Button>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Form Inputs</CardTitle>
            <CardDescription>Inputs, textarea y select</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Email" type="email" placeholder="tu@email.com" />
            <Input label="Password" type="password" error="La contraseña es requerida" />
            <Textarea label="Descripción" placeholder="Escribe una descripción..." rows={4} />
            <div>
              <label className="block text-sm font-medium text-neutral-text-primary mb-2">
                Dificultad
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una dificultad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={isChecked}
                onCheckedChange={(checked) => setIsChecked(checked as boolean)}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Acepto los términos y condiciones
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Etiquetas y estados</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="outline">Outline</Badge>
          </CardContent>
        </Card>

        {/* Alerts */}
        <div className="space-y-4">
          <Alert variant="default">
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>Este es un mensaje informativo.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <AlertTitle>¡Éxito!</AlertTitle>
            <AlertDescription>Tu solución fue aceptada.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTitle>Advertencia</AlertTitle>
            <AlertDescription>Tiempo límite excedido.</AlertDescription>
          </Alert>
          <Alert variant="error">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Respuesta incorrecta.</AlertDescription>
          </Alert>
        </div>

        {/* Dialog */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog / Modal</CardTitle>
            <CardDescription>Ventanas modales</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Abrir Modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Estás seguro?</DialogTitle>
                  <DialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="danger" onClick={() => setIsDialogOpen(false)}>
                    Eliminar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle>Dropdown Menu</CardTitle>
            <CardDescription>Menús desplegables</CardDescription>
          </CardHeader>
          <CardContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Abrir Menú</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Configuración</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Table</CardTitle>
            <CardDescription>Tablas de datos</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>1</TableCell>
                  <TableCell>Two Sum</TableCell>
                  <TableCell><Badge variant="success">Easy</Badge></TableCell>
                  <TableCell><Badge variant="success">AC</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2</TableCell>
                  <TableCell>Binary Search</TableCell>
                  <TableCell><Badge variant="primary">Medium</Badge></TableCell>
                  <TableCell><Badge variant="error">WA</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3</TableCell>
                  <TableCell>Graph Traversal</TableCell>
                  <TableCell><Badge variant="warning">Hard</Badge></TableCell>
                  <TableCell><Badge variant="default">Pending</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <Card>
          <CardHeader>
            <CardTitle>Pagination</CardTitle>
            <CardDescription>Paginación de resultados</CardDescription>
          </CardHeader>
          <CardContent>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive>1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink>2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink>3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>Pestañas de navegación</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="description">
              <TabsList>
                <TabsTrigger value="description">Descripción</TabsTrigger>
                <TabsTrigger value="solution">Solución</TabsTrigger>
                <TabsTrigger value="submissions">Envíos</TabsTrigger>
              </TabsList>
              <TabsContent value="description">
                <p className="text-neutral-text-muted">
                  Aquí va la descripción del problema...
                </p>
              </TabsContent>
              <TabsContent value="solution">
                <p className="text-neutral-text-muted">
                  Aquí va la solución del problema...
                </p>
              </TabsContent>
              <TabsContent value="submissions">
                <p className="text-neutral-text-muted">
                  Aquí van los envíos del usuario...
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Toast */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
            <CardDescription>Notificaciones temporales</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => toast({ variant: 'success', title: '¡Éxito!', description: 'Tu código fue enviado correctamente.' })}>
              Success Toast
            </Button>
            <Button variant="danger" onClick={() => toast({ variant: 'error', title: 'Error', description: 'Hubo un problema al enviar tu código.' })}>
              Error Toast
            </Button>
            <Button variant="outline" onClick={() => toast({ variant: 'warning', title: 'Advertencia', description: 'Tu sesión expirará pronto.' })}>
              Warning Toast
            </Button>
          </CardContent>
        </Card>

        {/* Skeleton Loaders */}
        <Card>
          <CardHeader>
            <CardTitle>Skeleton Loaders</CardTitle>
            <CardDescription>Estados de carga</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <SkeletonText lines={4} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState<'dashboard' | 'problems' | 'problem-detail' | 'demo'>('dashboard')

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <DashboardPage />
      case 'problems':
        return <ProblemsPage />
      case 'problem-detail':
        return <ProblemDetailPage />
      case 'demo':
        return <ComponentsDemo />
      default:
        return <DashboardPage />
    }
  }

  return (
    <ToastProvider>
      {/* Dev Navigation - Remove in production */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 bg-neutral-surface p-4 rounded-lg shadow-elevation-3 border border-neutral-border">
        <p className="text-xs font-semibold text-neutral-text-muted mb-2">
          Dev Navigation
        </p>
        <Button
          size="sm"
          variant={view === 'dashboard' ? 'primary' : 'outline'}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </Button>
        <Button
          size="sm"
          variant={view === 'problems' ? 'primary' : 'outline'}
          onClick={() => setView('problems')}
        >
          Problemas
        </Button>
        <Button
          size="sm"
          variant={view === 'problem-detail' ? 'primary' : 'outline'}
          onClick={() => setView('problem-detail')}
        >
          Detalle Problema
        </Button>
        <Button
          size="sm"
          variant={view === 'demo' ? 'primary' : 'outline'}
          onClick={() => setView('demo')}
        >
          Demo
        </Button>
      </div>

      {renderView()}
    </ToastProvider>
  )
}

export default App
