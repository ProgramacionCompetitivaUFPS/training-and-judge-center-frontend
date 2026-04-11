# Atributos de Calidad — Frontend Testing Strategy

> Documento de referencia para guiar el diseño e implementación de pruebas en el frontend del Training & Judge Center.

## Contexto

El Training & Judge Center es una plataforma de práctica de programación competitiva (tipo LeetCode). Los usuarios resuelven problemas, envían soluciones y reciben feedback automatizado de un juez. El sistema maneja 3 roles (ADMIN, COACH, CONTESTANT) con permisos diferenciados.

El proyecto prioriza **bajo mantenimiento a largo plazo**, por lo que las pruebas deben ser estables, enfocadas en comportamiento y resistentes a refactors.

---

## 1. Atributos de Calidad

### 1.1 Correctitud por Roles (Seguridad / Autorización)

**Qué es**: Verificar que la UI respeta las reglas de permisos del sistema. Cada rol (ADMIN, COACH, CONTESTANT) tiene visibilidad y acciones diferentes.

**Por qué es necesario**: Un CONTESTANT que ve botones de "Eliminar problema" o filtros de status "DRAFT" genera confusión y expone lógica interna. Aunque el backend rechazaría la acción, la UI no debería ofrecer lo que no se puede hacer.

**Cómo no rompe el objetivo**: Es el atributo más alineado con el producto. La plataforma necesita que cada usuario vea exactamente lo que le corresponde. No agrega complejidad, solo valida lo que ya debería funcionar.

**Qué testear**:
- Visibilidad de elementos por rol (botones, filtros, badges, secciones)
- Redirecciones cuando un rol no tiene acceso a una ruta
- Menús y navegación adaptados al rol activo

---

### 1.2 Robustez de Validación (Confiabilidad)

**Qué es**: Verificar que los formularios validan correctamente los datos antes de enviarlos al backend, usando los schemas Zod definidos.

**Por qué es necesario**: Un formulario de creación de contest con datos malformados puede causar errores silenciosos o estados inconsistentes. La validación client-side es la primera línea de defensa.

**Cómo no rompe el objetivo**: Los schemas Zod ya existen. Testearlos es validar infraestructura que ya está construida, no agregar nueva.

**Qué testear**:
- Campos requeridos muestran error al enviar vacíos
- Restricciones de formato (longitud, tipo, rango)
- Mensajes de error en español y asociados al campo correcto
- Valores por defecto correctos en formularios de creación vs edición

---

### 1.3 Manejo de Errores (Resiliencia)

**Qué es**: Verificar que la aplicación responde correctamente ante fallos de API, errores de red y estados inesperados.

**Por qué es necesario**: En una plataforma de contests con tiempo limitado, un error no manejado puede significar que un participante pierda una submission. El usuario necesita saber qué pasó y qué puede hacer.

**Cómo no rompe el objetivo**: El manejo de errores centralizado ya está diseñado en la arquitectura. Los tests solo verifican que funcione como se espera.

**Qué testear**:
- Toast de error ante respuestas 401, 403, 500
- Errores de validación del backend mapeados a campos del formulario
- Estados de error visibles (no pantallas en blanco)
- Retry o mensajes claros ante errores de red

---

### 1.4 Usabilidad / UX Correcta

**Qué es**: Verificar que la información crítica llega al usuario de forma clara y en el momento correcto.

**Por qué es necesario**: El usuario principal (CONTESTANT) necesita entender rápido el estado de su solución, el tiempo restante de un contest, y las reglas del problema. Una mala representación de estos datos afecta directamente la experiencia competitiva.

**Cómo no rompe el objetivo**: No se trata de testear diseño visual, sino de verificar que los componentes muestran la información correcta. Es testear comportamiento, no apariencia.

**Qué testear**:
- SubmissionStatusBadge muestra el estado correcto (Accepted, WA, TLE, etc.)
- ContestCountdown calcula y muestra el tiempo restante correctamente
- ContestStatusBadge refleja el estado real del contest (upcoming, running, finished)
- Tablas de standings muestran datos ordenados correctamente

---

### 1.5 Accesibilidad Básica

**Qué es**: Verificar que los componentes interactivos son usables con teclado y tecnologías asistivas.

**Por qué es necesario**: La plataforma es educativa. Excluir usuarios con discapacidades no es aceptable. Además, buena accesibilidad mejora la usabilidad para todos (navegación por teclado es más rápida para power users).

**Cómo no rompe el objetivo**: Radix UI ya provee accesibilidad de fábrica. Los tests solo verifican que no se haya roto al integrar. Es esfuerzo mínimo con alto impacto.

**Qué testear**:
- Diálogos se cierran con Escape y atrapan el foco
- Selects y dropdowns son navegables con teclado
- Formularios tienen labels asociados a inputs
- Roles ARIA correctos en componentes custom

---

### 1.6 Rendimiento Percibido (Estados de Carga)

**Qué es**: Verificar que la aplicación muestra feedback visual mientras carga datos, evitando pantallas en blanco o flashes de contenido.

**Por qué es necesario**: En un contest activo, el usuario necesita percibir que la app está respondiendo. Un loading state ausente genera incertidumbre ("¿se envió mi solución?", "¿está cargando o se rompió?").

**Cómo no rompe el objetivo**: Los skeletons y loading states ya están implementados. Solo se verifica que aparezcan cuando deben.

**Qué testear**:
- Skeletons visibles durante carga de datos
- Botones de submit deshabilitados durante envío (previene doble-submit)
- Paginación mantiene estado durante navegación
- No hay flashes de contenido vacío antes de que lleguen los datos

---

### 1.7 Integridad de Datos en Formularios

**Qué es**: Verificar que los formularios envían exactamente los datos que el backend espera, con la estructura correcta.

**Por qué es necesario**: Los formularios del sistema manejan estructuras complejas (problemas con test cases, contests con configuraciones de scoring, grupos con políticas de ingreso). Un campo mal mapeado puede crear datos corruptos en el backend.

**Cómo no rompe el objetivo**: Es una extensión natural de la validación. No agrega complejidad arquitectónica, solo verifica el contrato entre frontend y backend.

**Qué testear**:
- Payload enviado al backend coincide con la estructura esperada
- Campos opcionales se omiten correctamente cuando están vacíos
- Transformaciones de datos (fechas, enums) se aplican antes del envío
- Formularios de edición cargan los datos existentes correctamente

---

### 1.8 Consistencia de Estado (Cache / Queries)

**Qué es**: Verificar que después de mutaciones (crear, editar, eliminar), las listas y vistas relacionadas se actualizan correctamente.

**Por qué es necesario**: Con TanStack Query manejando el cache, un cache stale puede mostrar datos desactualizados. En un contest activo, ver standings desactualizados o una submission que "desapareció" es un problema real.

**Cómo no rompe el objetivo**: TanStack Query ya maneja la invalidación. Los tests verifican que las query keys se invaliden correctamente después de mutaciones.

**Qué testear**:
- Después de crear un problema, la lista de problemas se refresca
- Después de enviar una solución, la lista de submissions se actualiza
- Después de editar un contest, el detalle muestra los datos nuevos
- Navegación entre páginas no muestra datos stale

---

## 2. Matriz de Prioridad

Evaluación basada en: impacto en el usuario, riesgo si no se testea, y esfuerzo de implementación.

| # | Atributo | Impacto | Riesgo | Esfuerzo | Prioridad |
|---|----------|---------|--------|----------|-----------|
| 1 | Correctitud por Roles | 🔴 Alto | 🔴 Alto | 🟡 Medio | **P0 — Crítico** |
| 2 | Robustez de Validación | 🔴 Alto | 🟡 Medio | 🟢 Bajo | **P0 — Crítico** |
| 3 | Manejo de Errores | 🔴 Alto | 🔴 Alto | 🟡 Medio | **P1 — Alto** |
| 4 | Integridad de Datos | 🔴 Alto | 🔴 Alto | 🟡 Medio | **P1 — Alto** |
| 5 | Usabilidad / UX Correcta | 🟡 Medio | 🟡 Medio | 🟢 Bajo | **P1 — Alto** |
| 6 | Consistencia de Estado | 🟡 Medio | 🟡 Medio | 🟡 Medio | **P2 — Medio** |
| 7 | Rendimiento Percibido | 🟡 Medio | 🟢 Bajo | 🟢 Bajo | **P2 — Medio** |
| 8 | Accesibilidad Básica | 🟡 Medio | 🟢 Bajo | 🟢 Bajo | **P2 — Medio** |

### Criterios de evaluación

- **Impacto**: ¿Qué tan grave es para el usuario si esto falla?
- **Riesgo**: ¿Qué tan probable es que falle sin tests?
- **Esfuerzo**: ¿Cuánto cuesta implementar los tests?
- **P0**: Debe testearse antes de cualquier release
- **P1**: Debe testearse en la primera iteración de testing
- **P2**: Se testea cuando P0 y P1 estén cubiertos

---

## 3. Plan de Implementación

### Fase 0 — Setup (prerequisito)

**Objetivo**: Configurar el entorno de testing.

**Acciones**:
1. Instalar Vitest + React Testing Library + jsdom
2. Configurar `vitest.config.ts` integrado con Vite
3. Agregar script `"test": "vitest --run"` en package.json
4. Configurar MSW para tests (handlers reutilizables desde `src/mocks/`)
5. Crear helpers de test: `renderWithProviders()` que incluya QueryClientProvider, Router, AuthProvider
6. Verificar que un test trivial pasa

**Entregable**: Un test placeholder que renderiza `<App />` sin errores.

---

### Fase 1 — P0: Correctitud por Roles + Validación

**Objetivo**: Cubrir los dos atributos más críticos.

**Módulo: Correctitud por Roles**

| Test | Componente/Página | Qué verifica |
|------|-------------------|--------------|
| Navegación por rol | App / Router | CONTESTANT no puede acceder a rutas de admin |
| Visibilidad de acciones | ProblemsPage | CONTESTANT no ve botón "Crear problema" |
| Filtros por rol | ProblemsPage | CONTESTANT no ve filtros de status/accessibility |
| Badges por rol | ProblemsPage | CONTESTANT no ve badges de DRAFT |
| Acciones de detalle | ProblemDetailPage | CONTESTANT no ve botón "Editar" |
| Menú de navegación | Sidebar/Header | Items de menú varían según rol |

**Módulo: Robustez de Validación**

| Test | Componente | Qué verifica |
|------|-----------|--------------|
| Campos requeridos | ProblemFormPage | Submit vacío muestra errores |
| Límites de longitud | ContestFormPage | Título > max muestra error |
| Formato de fechas | ContestFormPage | Fecha inválida se rechaza |
| Schemas Zod | schemas/*.ts | Unit tests directos de schemas |
| Mensajes en español | Todos los forms | Errores se muestran en español |

---

### Fase 2 — P1: Errores + Integridad + UX

**Objetivo**: Cubrir los caminos de error y la correctitud de datos.

**Módulo: Manejo de Errores**

| Test | Escenario | Qué verifica |
|------|-----------|--------------|
| Error 401 | Sesión expirada | Redirige a login o muestra toast |
| Error 403 | Sin permisos | Muestra mensaje de acceso denegado |
| Error 500 | Fallo del servidor | Toast con mensaje genérico |
| Error de red | Sin conexión | Mensaje de error de conectividad |
| Error de validación backend | 422 con campos | Errores mapeados a campos del form |

**Módulo: Integridad de Datos**

| Test | Formulario | Qué verifica |
|------|-----------|--------------|
| Payload de creación | ProblemFormPage | Estructura enviada coincide con API spec |
| Payload de edición | ContestFormPage | Campos modificados se envían correctamente |
| Carga de datos existentes | MaterialFormPage | Formulario de edición pre-llena todos los campos |
| Campos opcionales | GroupFormPage | Campos vacíos no se envían como strings vacíos |

**Módulo: Usabilidad / UX**

| Test | Componente | Qué verifica |
|------|-----------|--------------|
| Status de submission | SubmissionStatusBadge | Cada status muestra texto y color correcto |
| Status de contest | ContestStatusBadge | upcoming/running/finished se calculan bien |
| Countdown | ContestCountdown | Tiempo restante se muestra correctamente |
| Standings | ContestStandingsPage | Datos ordenados por ranking |

---

### Fase 3 — P2: Cache + Rendimiento + Accesibilidad

**Objetivo**: Cubrir los atributos de menor riesgo pero que mejoran la calidad general.

**Módulo: Consistencia de Estado**

| Test | Flujo | Qué verifica |
|------|-------|--------------|
| Crear → listar | Crear problema → volver a lista | Lista incluye el nuevo problema |
| Editar → detalle | Editar contest → volver a detalle | Detalle muestra datos actualizados |
| Eliminar → listar | Eliminar material → volver a lista | Material ya no aparece |
| Submit → lista | Enviar solución → ver submissions | Nueva submission aparece |

**Módulo: Rendimiento Percibido**

| Test | Componente | Qué verifica |
|------|-----------|--------------|
| Loading states | EntityListPage | Skeleton visible durante carga |
| Submit loading | SubmitSolutionDialog | Botón deshabilitado durante envío |
| Paginación | DataTable | Estado de página se mantiene |

**Módulo: Accesibilidad**

| Test | Componente | Qué verifica |
|------|-----------|--------------|
| Dialog focus trap | SubmitSolutionDialog | Foco atrapado dentro del diálogo |
| Escape to close | Dialog, Dropdown | Escape cierra el componente |
| Keyboard nav | Select, Tabs | Navegable con flechas y Enter |
| Form labels | Todos los forms | Cada input tiene label asociado |

---

## 4. Atributos Descartados (y por qué)

| Atributo | Razón de exclusión |
|----------|-------------------|
| Performance profiling / bundle size | Prematuro para v0.0.1. Optimizar cuando haya usuarios reales y métricas. |
| E2E tests completos | Alto costo de mantenimiento. El valor no justifica el esfuerzo en esta etapa. |
| Visual regression testing | Requiere infraestructura adicional (Chromatic, Percy). Overkill para el tamaño del equipo. |
| Internacionalización | El sistema es solo en español por ahora. No hay plan de multi-idioma. |
| SEO | Es una SPA autenticada. SEO no aplica para el contenido principal. |
