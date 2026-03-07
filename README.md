# Training & Judge Center - Frontend

Sistema de componentes UI para el centro de entrenamiento y juez online, construido con React, TypeScript, Tailwind CSS y design tokens.

## Stack Tecnológico

- **Framework**: React 18 + Vite
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Componentes**: Radix UI primitives
- **Iconos**: Lucide React
- **Gestión de estado**: TanStack Query (React Query)
- **Formularios**: React Hook Form + Zod

## Componentes Disponibles

### Componentes Fundamentales
- ✅ **Button** - Botones con múltiples variantes (primary, secondary, outline, ghost, danger)
- ✅ **Input** - Campos de entrada con labels y manejo de errores
- ✅ **Textarea** - Áreas de texto con labels y validación
- ✅ **Select** - Selectores dropdown con Radix UI
- ✅ **Checkbox** - Casillas de verificación
- ✅ **Modal/Dialog** - Ventanas modales con overlay
- ✅ **Card** - Tarjetas con header, content y footer
- ✅ **Badge** - Etiquetas y badges de estado
- ✅ **Alert** - Alertas con variantes (success, error, warning, info)
- ✅ **Dropdown** - Menús desplegables

### Componentes Adicionales
- ✅ **Table** - Tablas de datos con header, body y footer
- ✅ **Pagination** - Paginación de resultados
- ✅ **Tabs** - Pestañas de navegación
- ✅ **Toast** - Notificaciones temporales con ToastProvider
- ✅ **Skeleton** - Loaders de carga

### Componentes de Características (Features)
- ✅ **ProblemCard** - Tarjeta de problema con dificultad y categorías
- ✅ **ProblemFilters** - Filtros de búsqueda y categorización
- ✅ **SubmissionStatusBadge** - Badge de estado de envío
- ✅ **CodeEditor** - Editor de código con selector de lenguaje
- ✅ **UserStats** - Estadísticas del usuario

### Layout
- ✅ **Header** - Barra de navegación con menú de usuario (legacy)
- ✅ **AppLayout** - Layout principal con Navbar, Sidebar y Breadcrumbs
- ✅ **Navbar** - Barra de navegación superior con notificaciones y menú de usuario
- ✅ **Sidebar** - Menú lateral colapsable con navegación y estadísticas
- ✅ **Breadcrumbs** - Navegación de ruta con iconos
- ✅ **ProblemLayout** - Layout split-view para páginas de problemas

### Páginas
- ✅ **DashboardPage** - Página de inicio con estadísticas y actividad reciente
- ✅ **ProblemsPage** - Página de listado de problemas con filtros
- ✅ **ProblemDetailPage** - Página de detalle con editor de código split-view
- ✅ **ComponentsDemo** - Demo interactiva de todos los componentes

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Preview de producción
npm run preview

# Linting
npm run lint
```

## Design Tokens

Todos los componentes están construidos siguiendo los design tokens definidos en `docs/design-tokens.md`:

### Colores
- **Brand Primary**: `#e11d48` (rosa/rojo)
- **Brand Accent**: `#d97706` (naranja)
- **Status Success**: `#059669` (verde)
- **Status Error**: `#b91c1c` (rojo)
- **Status Warning**: `#d97706` (naranja)

### Tipografía
- **Sans**: Inter
- **Mono**: JetBrains Mono

### Espaciado
Basado en una cuadrícula de 4px (spacing.1 = 4px, spacing.2 = 8px, etc.)

### Border Radius
- **sm**: 6px
- **md**: 12px
- **lg**: 24px
- **pill**: 9999px

## Estructura del Proyecto

```
training-and-judge-center-frontend/
├── docs/                      # Documentación
│   ├── design-tokens.md      # Tokens de diseño
│   └── stack.md              # Stack tecnológico
├── src/
│   ├── components/
│   │   ├── ui/               # Componentes UI reutilizables
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Alert.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ToastProvider.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   ├── features/         # Componentes de dominio
│   │   │   ├── ProblemCard.tsx
│   │   │   ├── ProblemFilters.tsx
│   │   │   ├── SubmissionStatusBadge.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   └── UserStats.tsx
│   │   └── layout/           # Componentes de layout
│   │       └── Header.tsx
│   ├── pages/                # Páginas de la aplicación
│   │   └── ProblemsPage.tsx
│   ├── hooks/                # Custom hooks
│   │   └── useToast.tsx
│   ├── lib/
│   │   ├── utils.ts          # Utilidades (cn helper)
│   │   └── constants.ts      # Constantes de la app
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   ├── App.tsx               # App principal con routing
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globales
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js        # Configuración con design tokens
```

## Uso de Componentes

### AppLayout - Layout Global

```tsx
import { AppLayout } from '@/components/layout'

function MyPage() {
  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Problemas', icon: Code2 },
        { label: 'Two Sum' }
      ]}
      showSidebar={true}
      maxWidth="container" // 'full' | 'container' | 'narrow'
    >
      <div>
        {/* Your page content */}
      </div>
    </AppLayout>
  )
}
```

### ProblemLayout - Split View

```tsx
import { ProblemLayout } from '@/components/layout'

function ProblemPage() {
  const leftPanel = <div>Problem description</div>
  const rightPanel = <div>Code editor</div>
  
  return (
    <ProblemLayout
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      splitRatio={50} // 0-100, default 50
    />
  )
}
```

### Toast con Provider

```tsx
import { ToastProvider, useToastContext } from '@/components/ui'

function App() {
  return (
    <ToastProvider>
      <YourApp />
    </ToastProvider>
  )
}

function YourComponent() {
  const { toast } = useToastContext()
  
  const handleSuccess = () => {
    toast({
      variant: 'success',
      title: '¡Éxito!',
      description: 'Operación completada',
      duration: 5000
    })
  }
}
```

### ProblemCard

```tsx
import { ProblemCard } from '@/components/features/ProblemCard'

<ProblemCard
  problem={problem}
  isSolved={true}
  onClick={() => navigate(`/problem/${problem.id}`)}
/>
```

### CodeEditor

```tsx
import { CodeEditor } from '@/components/features/CodeEditor'

<CodeEditor
  onSubmit={(code, language) => submitSolution(code, language)}
  onRun={(code, language) => runCode(code, language)}
/>
```

### Button

```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="md">
  Click me
</Button>

<Button variant="outline" isLoading>
  Loading...
</Button>
```

### Input

```tsx
import { Input } from '@/components/ui'

<Input 
  label="Email" 
  type="email" 
  placeholder="tu@email.com"
  error="Campo requerido"
/>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido de la tarjeta
  </CardContent>
</Card>
```

### Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título del Modal</DialogTitle>
    </DialogHeader>
    <p>Contenido del modal</p>
  </DialogContent>
</Dialog>
```

### Table

```tsx
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Columna 1</TableHead>
      <TableHead>Columna 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Dato 1</TableCell>
      <TableCell>Dato 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Próximos Pasos

1. Integrar TanStack Query para manejo de datos
2. Configurar React Hook Form + Zod para formularios
3. Crear páginas específicas (listado de problemas, detalle, editor)
4. Integrar con el backend API
5. Agregar autenticación y autorización
6. Implementar editor de código (Monaco/CodeMirror)

## Licencia

MIT
