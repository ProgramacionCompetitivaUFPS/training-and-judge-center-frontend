# Patrones Reutilizables

Este documento describe los patrones reutilizables disponibles en el proyecto. Estos patrones ahorran tiempo al proporcionar estructuras completas para casos de uso comunes.

---

## Patrones de Página

### 1. EntityListPage

**Uso:** Páginas de listado con búsqueda, filtros, tabla y paginación.

**Características:**
- Header con título, descripción y botón de crear
- Búsqueda y filtros personalizables
- Lista de items con renderizado personalizado
- Paginación
- Estados de carga y vacío
- Layout consistente con sidebar opcional

**Ejemplo:**

```tsx
import { EntityListPage } from '@/components/patterns'
import { ProblemCard } from '@/components/features/ProblemCard'

function ProblemsListPage() {
  return (
    <EntityListPage
      title="Problemas"
      description="Lista de problemas de programación"
      breadcrumbs={[{ label: 'Problemas', icon: Code2 }]}
      
      onCreateNew={() => navigate('/problems/new')}
      createButtonLabel="Nuevo Problema"
      
      searchComponent={<SearchBar />}
      filtersComponent={<ProblemFilters />}
      
      items={problems}
      isLoading={isLoading}
      renderItem={(problem) => (
        <ProblemCard problem={problem} />
      )}
      
      paginationComponent={<Pagination />}
    />
  )
}
```

---

### 2. EntityFormPage

**Uso:** Páginas de formulario con validación, secciones y acciones.

**Características:**
- Header con título y descripción
- Manejo de errores y validación
- Secciones opcionales para formularios complejos
- Botones de guardar/cancelar
- Estados de carga y envío
- Layout optimizado para formularios

**Ejemplo:**

```tsx
import { EntityFormPage } from '@/components/patterns'
import { Input, Textarea } from '@/components/ui'

function ProblemFormPage() {
  return (
    <EntityFormPage
      title="Crear Problema"
      description="Completa los campos para crear un nuevo problema"
      breadcrumbs={[
        { label: 'Problemas', href: '/problems' },
        { label: 'Nuevo' }
      ]}
      
      onSubmit={handleSubmit}
      onCancel={() => navigate('/problems')}
      isSubmitting={isSubmitting}
      error={error}
      validationErrors={errors}
      
      sections={[
        {
          title: 'Información Básica',
          description: 'Datos principales del problema',
          content: (
            <>
              <Input label="Título" {...register('title')} />
              <Textarea label="Descripción" {...register('description')} />
            </>
          )
        },
        {
          title: 'Configuración',
          content: (
            <>
              <Select label="Dificultad" {...register('difficulty')} />
              <Input label="Tiempo límite" {...register('timeLimit')} />
            </>
          )
        }
      ]}
    />
  )
}
```

---

### 3. EntityDetailPage

**Uso:** Páginas de detalle con metadata, tabs, secciones y acciones.

**Características:**
- Header con título, badges y acciones
- Metadata grid con iconos
- Tabs o secciones
- Menú de acciones (editar, eliminar, etc.)
- Estado de carga
- Layout flexible

**Ejemplo:**

```tsx
import { EntityDetailPage } from '@/components/patterns'
import { Clock, Users, CheckCircle } from 'lucide-react'

function ProblemDetailPage() {
  return (
    <EntityDetailPage
      title="Two Sum"
      subtitle="Problema #1"
      badges={[
        { label: 'Easy', variant: 'success' },
        { label: 'Array', variant: 'outline' }
      ]}
      breadcrumbs={[
        { label: 'Problemas', href: '/problems' },
        { label: 'Two Sum' }
      ]}
      
      onEdit={() => navigate('/problems/1/edit')}
      onDelete={handleDelete}
      primaryAction={{
        label: 'Resolver',
        onClick: () => navigate('/problems/1/solve'),
        variant: 'primary'
      }}
      
      metadata={[
        { label: 'Aceptados', value: '7,389', icon: CheckCircle },
        { label: 'Envíos', value: '15,234', icon: Users },
        { label: 'Tasa', value: '48.5%', icon: Clock }
      ]}
      
      tabs={[
        {
          id: 'description',
          label: 'Descripción',
          content: <ProblemDescription />
        },
        {
          id: 'submissions',
          label: 'Mis Envíos',
          badge: 5,
          content: <SubmissionsList />
        }
      ]}
    />
  )
}
```

---

## Patrones de Componente

### 4. DataTable

**Uso:** Tablas de datos con ordenamiento, selección y acciones.

**Características:**
- Columnas configurables con renderizado personalizado
- Ordenamiento por columna
- Selección múltiple con checkboxes
- Click en fila
- Estados de carga y vacío
- Responsive

**Ejemplo:**

```tsx
import { DataTable, Column } from '@/components/patterns'
import { Badge } from '@/components/ui'

const columns: Column<Problem>[] = [
  { key: 'id', label: 'ID', sortable: true, width: '80px' },
  { key: 'title', label: 'Título', sortable: true },
  {
    key: 'difficulty',
    label: 'Dificultad',
    render: (problem) => (
      <Badge variant={getDifficultyVariant(problem.difficulty)}>
        {problem.difficulty}
      </Badge>
    )
  },
  { key: 'acceptanceRate', label: 'Tasa', sortable: true, align: 'right' }
]

function ProblemsTable() {
  return (
    <DataTable
      columns={columns}
      data={problems}
      
      selectable
      selectedItems={selected}
      onSelectionChange={setSelected}
      
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={handleSort}
      
      onRowClick={(problem) => navigate(`/problems/${problem.id}`)}
      
      isLoading={isLoading}
      emptyMessage="No se encontraron problemas"
    />
  )
}
```

---

### 5. StatsGrid

**Uso:** Grid de estadísticas con iconos y tendencias.

**Características:**
- Grid responsive (1-4 columnas)
- Iconos personalizables
- Tendencias con porcentaje
- Descripciones opcionales
- Colores personalizables

**Ejemplo:**

```tsx
import { StatsGrid, StatItem } from '@/components/patterns'
import { Target, TrendingUp, Trophy, Award } from 'lucide-react'

const stats: StatItem[] = [
  {
    label: 'Problemas Resueltos',
    value: '45/150',
    icon: Target,
    color: 'text-brand-primary',
    trend: { value: 12, label: 'vs mes anterior', isPositive: true }
  },
  {
    label: 'Tasa de Éxito',
    value: '68%',
    icon: TrendingUp,
    color: 'text-status-success'
  },
  {
    label: 'Total Envíos',
    value: 128,
    icon: Trophy,
    color: 'text-brand-accent'
  },
  {
    label: 'Ranking',
    value: '#234',
    icon: Award,
    description: 'Top 10% global'
  }
]

function UserDashboard() {
  return <StatsGrid stats={stats} columns={4} />
}
```

---

### 6. SearchAndFilter

**Uso:** Barra de búsqueda con filtros configurables.

**Características:**
- Búsqueda con icono
- Filtros personalizables en grid
- Contador de filtros activos
- Botón de limpiar filtros
- Acciones adicionales

**Ejemplo:**

```tsx
import { SearchAndFilter, FilterConfig } from '@/components/patterns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'

const filters: FilterConfig[] = [
  {
    key: 'difficulty',
    label: 'Dificultad',
    component: (
      <Select value={difficulty} onValueChange={setDifficulty}>
        <SelectTrigger>
          <SelectValue placeholder="Todas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
        </SelectContent>
      </Select>
    )
  },
  {
    key: 'status',
    label: 'Estado',
    component: <StatusSelect />
  }
]

function ProblemFilters() {
  return (
    <SearchAndFilter
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar problemas..."
      
      filters={filters}
      activeFiltersCount={getActiveFiltersCount()}
      onClearFilters={clearFilters}
      
      additionalActions={
        <Button variant="outline">Exportar</Button>
      }
    />
  )
}
```

---

### 7. EmptyState

**Uso:** Estado vacío con icono, mensaje y acción.

**Características:**
- Icono personalizable
- Título y descripción
- Acción opcional con botón
- Contenido personalizado
- Centrado y responsive

**Ejemplo:**

```tsx
import { EmptyState } from '@/components/patterns'
import { FileQuestion, Plus } from 'lucide-react'

function NoProblems() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No hay problemas"
      description="Comienza creando tu primer problema de programación"
      action={{
        label: 'Crear Problema',
        onClick: () => navigate('/problems/new'),
        icon: Plus
      }}
    />
  )
}
```

---

## Beneficios de los Patrones

1. **Consistencia:** Todas las páginas similares se ven y funcionan igual
2. **Velocidad:** Crear nuevas páginas toma minutos en lugar de horas
3. **Mantenibilidad:** Cambios en un patrón se propagan a todas las instancias
4. **Menos Bugs:** Código probado y reutilizado
5. **Onboarding:** Nuevos desarrolladores entienden la estructura rápidamente

---

## Cuándo Usar Cada Patrón

| Patrón | Usar Cuando |
|--------|-------------|
| EntityListPage | Necesitas listar items con búsqueda/filtros |
| EntityFormPage | Necesitas crear/editar una entidad |
| EntityDetailPage | Necesitas mostrar detalles de una entidad |
| DataTable | Necesitas una tabla con funcionalidad avanzada |
| StatsGrid | Necesitas mostrar métricas/estadísticas |
| SearchAndFilter | Necesitas búsqueda + múltiples filtros |
| EmptyState | Necesitas mostrar un estado vacío |

---

## Personalización

Todos los patrones son altamente personalizables:
- Acepta componentes personalizados como props
- Soporta renderizado condicional
- Permite override de estilos
- Flexible en layout y estructura
