# Testing Standards

---

## 1. Archivos y ubicación

| Regla | Ejemplo |
|---|---|
| Co-located con el archivo que testea | `src/lib/utils.ts` → `src/lib/utils.test.ts` |
| `.test.tsx` si el archivo contiene JSX | wrappers, `render()`, componentes inline |
| `.test.ts` si no hay JSX | hooks con `React.createElement`, utils, schemas |
| Nunca en carpeta `__tests__/` separada | mantiene la proximidad con el código |

---

## 2. Estructura interna

```
imports (ver sección 3)

mocks de módulos con vi.mock (antes de imports que los usan)

referencias estables de mocks a nivel de módulo

beforeEach / afterEach de limpieza

describe('NombreDeLaFunción', () => {
  it('hace X cuando Y', ...)
  it('no hace X cuando Z', ...)
})
```

Un `describe` por función/hook/componente exportado.
El nombre del `it` describe el comportamiento observable, no la implementación:
- ✅ `'retorna lista paginada cuando el servidor responde 200'`
- ❌ `'calls getProblems and sets data'`

---

## 3. Orden de imports

```ts
// 1. Vitest
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 2. React Testing Library
import { render, screen, waitFor, act, renderHook } from '@testing-library/react'

// 3. React (solo si se usa React.createElement o tipos)
import React from 'react'

// 4. TanStack Query (solo si el test lo necesita directamente)
import { QueryClientProvider } from '@tanstack/react-query'

// 5. MSW
import { http, HttpResponse, delay } from 'msw'

// 6. Proyecto — infraestructura de test
import { server } from '@/mocks/server'
import { createTestQueryClient, renderWithProviders, renderWithRouter } from '@/test/renderWithProviders'

// 7. Proyecto — tokenStore / mocks de datos
import { setAccessToken, clearAccessToken, resetSessionExpiredNotified } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'

// 8. Proyecto — código bajo test
import { useProblems, problemKeys } from './useProblems'
import { Button } from './Button'
```

Separar grupos con una línea en blanco.

---

## 4. Wrapper para hooks (`renderHook`)

```ts
// Crear wrapper dentro del test o en helper local al archivo.
// React.createElement evita necesitar JSX en archivos .ts
function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

// Uso:
const { wrapper, queryClient } = makeWrapper()
const { result } = renderHook(() => useProblems(), { wrapper })
```

**Nunca** pasar el QueryClient como prop al componente raíz directamente:
```ts
// ❌ — se rompe con rerender()
render(<QueryClientProvider client={client}><UI /></QueryClientProvider>)

// ✅ — los providers sobreviven rerender()
render(<UI />, { wrapper: ({ children }) => <QueryClientProvider ...>{children}</QueryClientProvider> })
```

---

## 5. Wrapper para componentes (`render`)

Usar `renderWithProviders` del helper existente para componentes que necesitan router + query:

```ts
import { renderWithProviders, renderWithRouter } from '@/test/renderWithProviders'

// Solo router:
renderWithRouter(<MyComponent />, { initialEntries: ['/ruta'] })

// Router + QueryClient:
renderWithProviders(<MyComponent />, { initialEntries: ['/ruta'] })
```

Para componentes con providers propios (AuthProvider), usar la opción `wrapper`:

```ts
function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

render(<AuthProvider><Consumer /></AuthProvider>, { wrapper: Wrapper })
// o equivalente:
render(<Wrapper><AuthProvider>...</AuthProvider></Wrapper>)
```

---

## 6. QueryClient en tests

```ts
// ✅ — fresco por test, fuera del cuerpo del componente Wrapper
let queryClient: QueryClient
beforeEach(() => {
  queryClient = createTestQueryClient()
})

// ❌ — se recrea en cada re-render (bug sutil de TanStack Query)
function Wrapper({ children }) {
  return <QueryClientProvider client={createTestQueryClient()}>...
}
```

---

## 7. MSW — reglas

```ts
// Usar siempre — nunca vi.mock() de módulos de API
// La URL base en tests es siempre 'http://localhost:8080/api'

// Override puntual dentro de un test:
server.use(
  http.get('http://localhost:8080/api/problems', () =>
    HttpResponse.json({ error: 'SERVER_ERROR' }, { status: 500 }),
  ),
)
// server.resetHandlers() en afterEach ya está en setup.ts — no hace falta llamarlo manualmente

// Para un handler que nunca debe resolver (test de isLoading):
server.use(
  http.post('http://localhost:8080/api/auth/refresh', () => delay('infinite')),
)
// ❌ new Promise(() => {}) — genera open handle en Vitest
```

`onUnhandledRequest: 'error'` está configurado en `setup.ts`.
Un typo en una URL produce fallo inmediato, no un warning silencioso.

---

## 8. Mocks de módulos

```ts
// Referencia estable a nivel de módulo — nunca dentro de la factory
const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

// ❌ — crea un vi.fn() nuevo en cada llamada, imposible de observar
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}))

// Limpiar en beforeEach para evitar contaminación entre tests:
beforeEach(() => {
  mockToast.mockClear()
})
```

---

## 9. TypeScript — sin casts inseguros

```ts
// ❌ — suprime TypeScript completamente
user: { id: '1' } as never
mutate({ ... } as never)

// ✅ — importar el tipo real
import type { CreateProblemRequest } from '@/types/problem'
mutate({ title: 'T', slug: 's', ... } satisfies CreateProblemRequest)

// ✅ — si el tipo real es muy grande y el test solo necesita un subconjunto
user: { ...mockCurrentUser, role: 'CONTESTANT' }

// ✅ — último recurso si el tipo no es importable
user: { id: '1' } as unknown as User
```

---

## 10. Queries del DOM

```ts
// Orden de preferencia (más semántico primero):
screen.getByRole('button', { name: /guardar/i })   // ✅ rol + nombre
screen.getByRole('status')                          // ✅ rol
screen.getByText('Aceptado')                        // ✅ texto visible
screen.getByTestId('submit-form')                   // ⚠️ solo si no hay alternativa semántica

// ❌ — testea implementación, no comportamiento
container.querySelector('.animate-pulse')
container.querySelector('[class*="btn-primary"]')
```

`data-testid` está permitido para contenedores sin semántica propia (formularios, secciones)
o cuando el elemento no tiene texto ni rol observable.

Nunca usar clase CSS como selector en tests.

---

## 11. Asserts — profundidad mínima

```ts
// ❌ — demasiado superficial, pasa con cualquier array vacío o malformado
expect(Array.isArray(result.current.data?.problems)).toBe(true)
expect(result.current.data).toBeDefined()

// ✅ — verifica valor concreto del mock
expect(result.current.data?.problems[0].slug).toBe('two-sum')
expect(result.current.data?.pagination.total).toBeGreaterThan(0)
expect(result.current.data?.id).toBe('contest-1')

// Para errores:
// ❌
expect(result.current.isError).toBe(true)

// ✅ (cuando el tipo de error importa)
expect(result.current.error).toBeInstanceOf(ApiClientError)
expect((result.current.error as ApiClientError).status).toBe(404)
```

---

## 12. Mutaciones — verificar invalidación

```ts
it('invalida las keys correctas al crear', async () => {
  const { wrapper, queryClient } = makeWrapper()
  const spy = vi.spyOn(queryClient, 'invalidateQueries')

  const { result } = renderHook(() => useCreateProblem(), { wrapper })
  result.current.mutate({ title: 'T', slug: 's', ... })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: problemKeys.all }),
  )
})
```

---

## 13. Async — cuándo usar qué

| Situación | Herramienta |
|---|---|
| Esperar que un query resuelva | `await waitFor(() => expect(result.current.isSuccess).toBe(true))` |
| Esperar que un componente actualice | `await waitFor(() => expect(screen.getByText('...')).toBeInTheDocument())` |
| Disparar un evento imperativo síncrono | `act(() => { notifySessionExpired() })` |
| Avanzar timers | `act(() => vi.advanceTimersByTime(1100))` — requiere activar fake timers primero (ver abajo) |
| Esperar UI después de interacción async | `await userEvent.click(button)` (userEvent ya envuelve en act) |

**Fake timers** — activar y desactivar explícitamente cuando el test los necesita:

```ts
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()  // ← obligatorio: si se omite, contamina todos los tests del archivo
})

it('oculta el toast después de 3 segundos', () => {
  render(<Toast message="Guardado" />)
  expect(screen.getByText('Guardado')).toBeInTheDocument()

  act(() => vi.advanceTimersByTime(3000))

  expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
})
```

No activar fake timers globalmente en `setup.ts` — solo en los archivos que los necesiten.

`waitFor` tiene timeout de 1000ms por defecto. Pasar `{ timeout: 3000 }` solo cuando el handler MSW tiene delays largos (> 500ms).

---

## 13b. `userEvent` vs `fireEvent`

Preferir siempre `userEvent` para simular interacciones del usuario. `fireEvent` solo se acepta para eventos que `userEvent` no cubre (p.ej. drag-and-drop personalizado).

```ts
// ✅ — userEvent v14: llamar setup() una vez por test o por archivo
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()
await user.click(button)              // dispara mousedown → focus → mouseup → click
await user.type(input, 'hola')        // dispara keydown/keypress/input/keyup por letra
await user.clear(input)
await user.selectOptions(select, 'opcion')

// ❌ — fireEvent es síncrono y omite eventos intermedios
fireEvent.change(input, { target: { value: 'hola' } })  // React Hook Form puede no reaccionar
fireEvent.click(button)
```

`userEvent.setup()` crea una instancia que mantiene estado entre interacciones (clipboard, delays, pointer position). Instanciar una vez por `describe` o por `it`, nunca dentro del Wrapper.

```ts
describe('LoginPage', () => {
  const user = userEvent.setup()  // una instancia para todos los it del describe

  it('muestra error si el email está vacío', async () => {
    render(<LoginPage />)
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    expect(screen.getByText(/email requerido/i)).toBeInTheDocument()
  })
})
```

---

## 14. Estado compartido — limpieza explícita

Siempre limpiar en `beforeEach` los singletons que los tests pueden contaminar:

```ts
beforeEach(() => {
  clearAccessToken()           // tokenStore
  resetSessionExpiredNotified() // tokenStore guard
  queryClient.clear()           // caché de TanStack Query
  mockToast.mockClear()         // spies / vi.fn()
  localStorage.clear()          // si algún test escribe en localStorage
})
```

---

## 15. Tests de bajo valor — no escribir

| Patrón | Por qué evitarlo |
|---|---|
| Key factory tautológica: `expect(keys.list(p)).toEqual(['resource', 'list', p])` | Verifica que un array literal es igual a sí mismo |
| Render-only sin assert de comportamiento: `expect(container.firstChild).toBeInTheDocument()` | No detecta regresiones reales |
| Test que solo verifica que el componente no explota | Pasa aunque el output sea completamente incorrecto |

La pregunta de control: **¿Este test fallaría si introdujera un bug concreto?** Si la respuesta es no o "depende", el test no tiene valor.

---

## 16. Patrones de diseño en tests

### Arrange / Act / Assert (AAA)

Estructura obligatoria de cada `it`. Separar las tres fases visualmente cuando el test tiene más de 5 líneas:

```ts
it('invalida el caché al crear un problema', async () => {
  // Arrange
  const { wrapper, queryClient } = makeWrapper()
  const spy = vi.spyOn(queryClient, 'invalidateQueries')
  const { result } = renderHook(() => useCreateProblem(), { wrapper })

  // Act
  result.current.mutate({ title: 'T', slug: 's', difficulty: 'EASY' })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  // Assert
  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: problemKeys.all }),
  )
})
```

Tests cortos (3–4 líneas) no necesitan los comentarios — la separación es evidente.

---

### Valores en assertions: literales vs referencias a mocks

Los valores esperados en assertions son **literales explícitos**, no referencias dinámicas al array de mocks.

```ts
// ❌ — se acopla al índice del array; si se reordena el mock, el test cambia de comportamiento silenciosamente
expect(result.current.data?.id).toBe(mockProblems[0].slug)
result.current.mutate({ id: mockSubmissions[5].id, ... })

// ✅ — literal intencional; quien lo escribe eligió ese valor conscientemente
expect(result.current.data?.slug).toBe('two-sum')
result.current.mutate({ id: 'sub-006-aaaa-bbbb-cccc-ddddeeee0006', ... })
```

**Reglas:**

1. Los literales son intencionales: el autor eligió ese valor porque quiere probar ese caso concreto. Un lector entiende el test sin abrir el archivo de mocks.
2. Las referencias dinámicas (`mockX[i].campo`, `mockX.find(...)`) acoplan el test a la estructura interna de los datos de prueba — un mock reordenado rompe el test por razones ajenas al comportamiento del sistema.
3. Las mutaciones que devuelven un cuerpo **siempre** deben verificar al menos un campo de `result.current.data`, además de los spies de invalidación.
4. Los tests de query deben verificar al menos un item concreto de la lista, no solo `length > 0` o `isSuccess`.

**Excepción aceptable:** referenciar el mock para campos de identidad en assertions de *presencia* dentro de una lista, cuando el ID es un UUID largo cuya escritura manual sería propensa a errores:

```ts
// Aceptable — la referencia es legible y el acoplamiento es intencional
expect(result.current.data?.groups.some((g) => g.id === mockGroups[0].id)).toBe(true)
```

---

### Factory Function

Función que crea el entorno de test (wrapper + clientes) y retorna todo lo necesario. Evita repetir la misma inicialización en cada `it`.

```ts
// Definir una vez por archivo, arriba del primer describe
function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

// Usar en cada test que lo necesite
const { wrapper, queryClient } = makeWrapper()
```

Regla: cada test llama a `makeWrapper()` para obtener un QueryClient fresco. No compartir el mismo cliente entre tests de distintos `it`.

---

### Object Mother

`src/mocks/data.ts` es el Object Mother del proyecto: fuente única de objetos de dominio canónicos para tests. Siempre usar estos en lugar de construir objetos inline.

```ts
// ✅ — usa el objeto canónico del proyecto
import { mockCurrentUser, mockProblems } from '@/mocks/data'
mockUseAuth.mockReturnValue({ user: mockCurrentUser, ... })

// ❌ — objeto inline frágil, se desincroniza si cambia el tipo
mockUseAuth.mockReturnValue({ user: { id: '1', nickname: 'test', role: 'ADMIN' }, ... })
```

Si el test necesita una variante del objeto canónico, hacer spread y sobreescribir solo el campo relevante:

```ts
// ✅ — variante mínima
{ ...mockCurrentUser, role: 'CONTESTANT' }

// ❌ — duplica el objeto completo
{ id: 'user-luisadmin', email: 'admin@...', name: 'Luis', role: 'CONTESTANT', ... }
```

---

### Builder (para inputs complejos de mutaciones)

Cuando una mutación requiere un payload con muchos campos, construir el input mínimo válido usando el tipo real y sobreescribir solo lo que importa al test:

```ts
import type { CreateProblemRequest } from '@/types/problem'

const baseProblem: CreateProblemRequest = {
  title: 'Test Problem',
  slug: 'test-problem',
  difficulty: 'EASY',
  timeLimit: 1000,
  memoryLimit: 256,
  // ... todos los campos requeridos con valores genéricos
}

it('invalida caché al crear', async () => {
  result.current.mutate(baseProblem)
  ...
})

it('invalida caché con problema difícil', async () => {
  result.current.mutate({ ...baseProblem, difficulty: 'HARD' })
  ...
})
```

No usar `as never` ni `as any` para evadir el tipado — el tipo real es la documentación viva del contrato de la API.

---

### Page Object Model (POM) — para tests de páginas (PR 5+)

Cuando se testea una página completa, encapsular las interacciones en un objeto para no repetir selectores en cada `it`:

```ts
class LoginPageObject {
  private user = userEvent.setup()

  async fillEmail(value: string) {
    await this.user.type(screen.getByLabelText(/correo/i), value)
    return this
  }
  async fillPassword(value: string) {
    await this.user.type(screen.getByLabelText(/contraseña/i), value)
    return this
  }
  async submit() {
    await this.user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    return this
  }
}

// Uso en cada test:
const page = new LoginPageObject()
await page.fillEmail('admin@test.com')
await page.fillPassword('Pass1234!')
await page.submit()
await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument())
```

Beneficio: si cambia el label de un input, se corrige en un solo lugar.

---

## 17. Tests parametrizados con `it.each`

Cuando varios `it` tienen la misma estructura y solo varían los datos, usar `it.each`:

```ts
// ✅ — evita repetición y documenta todos los casos juntos
const STATUS_LABELS: [SubmissionStatus, string][] = [
  ['ACCEPTED', 'Aceptado'],
  ['WRONG_ANSWER', 'Respuesta Incorrecta'],
  ['PENDING', 'Pendiente'],
]

it.each(STATUS_LABELS)('muestra label correcto para %s', (status, label) => {
  render(<SubmissionStatusBadge status={status} />)
  expect(screen.getByText(label)).toBeInTheDocument()
})

// ❌ — 10 its idénticos con datos distintos
it('muestra Aceptado para ACCEPTED', () => { ... })
it('muestra Respuesta Incorrecta para WRONG_ANSWER', () => { ... })
```

Usar cuando hay 3 o más casos con la misma estructura.

---

## 18. Taxonomía de test doubles

No todos los reemplazos son iguales. Usar el término correcto ayuda a entender qué se está verificando:

| Tipo | Qué es | Ejemplo en este proyecto |
|---|---|---|
| **Fake** | Implementación alternativa funcional, más simple | MSW — intercepta HTTP real, retorna datos ficticios |
| **Stub** | Retorna valores predefinidos, no verifica llamadas | `vi.fn().mockReturnValue(...)` para `useAuth` |
| **Spy** | Envuelve la implementación real, registra las llamadas | `vi.spyOn(queryClient, 'invalidateQueries')` |
| **Mock** | Reemplaza el módulo completo | `vi.mock('@/hooks/useToastContext', ...)` |

Regla práctica:
- HTTP → siempre **Fake** (MSW)
- Dependencias de contexto sin lógica que testear → **Stub** (`vi.mock`)
- Verificar que algo fue llamado → **Spy** (`vi.spyOn`)
- Nunca mockear el módulo de API (`@/api/*`) — eso salta la capa de cliente y hace el test inútil

---

## 19. Tipos de test y qué profundidad esperar

| Tipo | Qué cubre | Ejemplo |
|---|---|---|
| **Unit** | Una función pura, sin dependencias externas | `utils.test.ts`, `schemas.test.ts` |
| **Unit de componente** | Un componente aislado, sin red ni routing real | `Button.test.tsx`, `Badge.test.tsx` |
| **Integración de hook** | Hook + cliente API + MSW (red real interceptada) | `useProblems.test.ts` |
| **Integración de componente** | Componente + providers reales + MSW | `AuthProvider.test.tsx` |
| **Integración de página** | Página completa + routing + providers + MSW | `LoginPage.test.tsx` (PR 5) |

A mayor nivel de integración, menos tests pero más valor. No replicar en integración lo que ya cubre unit.

---

## 20. No usar snapshots

`toMatchSnapshot()` y `toMatchInlineSnapshot()` están prohibidos en este proyecto.

**Por qué:** los snapshots capturan el output completo del DOM o del objeto. Cualquier cambio de estilo, atributo de accesibilidad o texto inocuo rompe el test y requiere actualizar el snapshot — genera ruido sin valor real. Los snapshots testean "que nada cambió", no "que el comportamiento es correcto".

```ts
// ❌
expect(container).toMatchSnapshot()

// ✅ — verifica el comportamiento concreto que importa
expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled()
expect(screen.getByText('Aceptado')).toHaveClass('text-success')
```

---

## 21. Convenciones de orden dentro de un `describe`

Orden recomendado de los `it` dentro de cada `describe`:

1. **Happy path** — el caso exitoso más común
2. **Variantes del happy path** — parámetros distintos, mismo resultado exitoso
3. **Guards / enabled** — casos donde el hook/componente no hace nada (`enabled: false`, prop vacía)
4. **Errores** — 4xx, 5xx, validaciones fallidas
5. **Efectos secundarios** — invalidaciones de caché, eventos, callbacks

```ts
describe('useProblemDetail', () => {
  it('retorna el detalle del problema para un slug válido', ...)       // 1. happy path
  it('no hace fetch cuando el slug está vacío', ...)                   // 3. guard
  it('propaga error 404 para un slug desconocido', ...)               // 4. error
})
```

---

## 22. Testing de formularios (React Hook Form + Zod)

Los formularios del proyecto usan RHF + Zod. Tres reglas específicas:

**1. Usar `userEvent.type` — no `fireEvent.change`**

RHF registra cada keystroke. `fireEvent.change` inyecta el valor final de golpe y puede no activar las validaciones `onChange`.

```ts
// ✅
await user.type(screen.getByLabelText(/título/i), 'Mi problema')

// ❌ — RHF puede no reaccionar a esto
fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Mi problema' } })
```

**2. Triggear validación con submit, no con blur manual**

Zod valida al hacer submit por defecto. Para tests de error, hacer click en el botón de submit con el campo vacío:

```ts
it('muestra error si el título está vacío', async () => {
  render(<CreateProblemForm />)

  await user.click(screen.getByRole('button', { name: /crear/i }))

  expect(screen.getByText(/el título es requerido/i)).toBeInTheDocument()
})
```

**3. Queries para mensajes de error de Zod**

Los mensajes de error de RHF se renderizan típicamente en un `<p>`, cuyo rol implícito es `paragraph`, **no** `alert`. Para que `getByRole('alert')` funcione, el componente debe declarar `role="alert"` explícitamente. Si no lo hace, localizar por texto es la opción segura:

```ts
// ✅ — solo si el componente declara role="alert" explícitamente
expect(screen.getByRole('alert')).toHaveTextContent(/requerido/i)

// ✅ — alternativa siempre válida (no depende de ARIA implícito)
expect(screen.getByText(/el slug solo puede contener/i)).toBeInTheDocument()

// ✅ — si hay múltiples errores y el componente declara role="alert"
expect(screen.getAllByRole('alert')).toHaveLength(2)
```

**Ejemplo completo:**

```ts
describe('CreateProblemForm', () => {
  const user = userEvent.setup()

  it('envía el formulario con datos válidos', async () => {
    renderWithProviders(<CreateProblemForm />)

    await user.type(screen.getByLabelText(/título/i), 'Two Sum')
    await user.type(screen.getByLabelText(/slug/i), 'two-sum')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    await waitFor(() =>
      expect(screen.getByText(/problema creado/i)).toBeInTheDocument(),
    )
  })

  it('muestra errores de validación si los campos requeridos están vacíos', async () => {
    renderWithProviders(<CreateProblemForm />)

    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })
})
```

---

## Patrones para tests de integración de páginas

### Rutas con parámetros dinámicos

Las páginas que usan `useParams` necesitan que el router provea la ruta exacta con el patrón de parámetros; `MemoryRouter` solo no es suficiente:

```tsx
// ❌ — useParams() devuelve {} porque MemoryRouter no interpreta el path
render(
  <MemoryRouter initialEntries={['/problems/two-sum/submissions']}>
    <ProblemSubmissionsPage />
  </MemoryRouter>
)

// ✅ — el path pattern está declarado y los params se resuelven correctamente
render(
  <MemoryRouter initialEntries={['/problems/two-sum/submissions']}>
    <Routes>
      <Route path="/problems/:slug/submissions" element={<ProblemSubmissionsPage />} />
    </Routes>
  </MemoryRouter>
)
```

### Token de autenticación en tests de páginas

Las páginas que usan `AppLayout` y llaman a endpoints autenticados necesitan que el token esté configurado **antes** de que el componente monte:

```tsx
beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())
```

El token determina qué devuelve el handler MSW (por ejemplo, qué envíos PRIVATE son visibles). Debe coincidir con la identidad que el test pretende simular.

### Verificar navegación post-acción

Para comprobar que una página navega a otra ruta tras una acción (login exitoso, creación de recurso, etc.), registra un centinela en la ruta destino:

```tsx
render(
  <MemoryRouter initialEntries={['/login']}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<div>DASHBOARD_SENTINEL</div>} />
    </Routes>
  </MemoryRouter>
)

// Tras la acción:
await waitFor(() => {
  expect(screen.getByText('DASHBOARD_SENTINEL')).toBeInTheDocument()
})
```

Usar `window.location` o `history.location` del router es frágil; el centinela es más explícito y robusto.
