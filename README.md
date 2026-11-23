# Training & Judge Center — Frontend

Interfaz web de una plataforma de **programación competitiva**: concursos con tabla de posiciones en vivo, banco de problemas con validación automática, grupos de entrenamiento, equipos y material didáctico. Es una **SPA** (aplicación de una sola página) construida con React 18, TypeScript y Vite; consume la API REST del backend y, en desarrollo, puede funcionar completamente con datos simulados.

> Este repositorio es solo la parte visual. El juez (que compila y ejecuta las soluciones) y la API viven en el backend.

---

## Tabla de contenidos

1. [Qué hace la aplicación](#qué-hace-la-aplicación)
2. [Stack tecnológico](#stack-tecnológico)
3. [Requisitos](#requisitos)
4. [Puesta en marcha](#puesta-en-marcha)
5. [Variables de entorno](#variables-de-entorno)
6. [Datos simulados (mocks)](#datos-simulados-mocks)
7. [Scripts disponibles](#scripts-disponibles)
8. [Pruebas](#pruebas)
9. [Calidad de código](#calidad-de-código)
10. [Arquitectura](#arquitectura)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Roles y rutas](#roles-y-rutas)
13. [Despliegue](#despliegue)
14. [Contribuir](#contribuir)
15. [Documentación adicional](#documentación-adicional)

---

## Qué hace la aplicación

La plataforma tiene tres tipos de usuario (ver [Roles](#roles-y-rutas)):

- **Competidor (`CONTESTANT`)**: se inscribe a concursos, resuelve problemas enviando código o bloques de Blockly, consulta la tabla de posiciones y revisa sus envíos.
- **Coach (`COACH`)**: crea y edita problemas (enunciado, límites, casos de prueba, soluciones de referencia), publica tras validarlos, y organiza concursos y grupos donde es líder.
- **Administrador (`ADMIN`)**: gestiona usuarios, roles, desactivaciones y rejuzgamientos globales.

### Módulos principales

| Módulo | Qué incluye |
|---|---|
| **Problemas** | Listado con filtros, detalle con enunciado en Markdown y fórmulas KaTeX, editor de problemas, gestión de archivos del paquete (ZIP en formato ICPC), revisión del paquete antes de subirlo, validación y publicación, estadísticas, visibilidad pública o privada, exportación a ZIP. |
| **Envíos** | Envío de código (C++ 20, Java 17, Python 3.10) o de bloques de Blockly, historial, recuperación de borradores, detalle con el veredicto y el código fuente. |
| **Concursos** | Creación y edición con fechas, modalidad (individual, por equipos o mixta), freeze y revelado automático de resultados, inscripción tardía, colores de globos por problema, tabla de posiciones y post-competencia. |
| **Grupos** | Grupos con políticas de ingreso (abierto, por solicitud o por invitación), miembros, líderes, invitaciones y solicitudes. |
| **Equipos** | Creación de equipos y registro a concursos por equipo, con alineación editable mientras el concurso esté programado. |
| **Material** | Publicación de material didáctico por grupo, con etiquetas, búsqueda, autores, fijado y borradores. |
| **Usuarios** | Perfil, tablero personal con racha y próximos concursos, y gestión administrativa. |

### Ejecución de código en el navegador

Los bloques de Blockly se traducen a Python y pueden ejecutarse localmente con **Pyodide** (Python compilado a WebAssembly) dentro de un *Web Worker*, para que el competidor pruebe su solución antes de enviarla. La ejecución tiene un límite de 5 s, y la carga inicial de Pyodide, 30 s.

---

## Stack tecnológico

| Área | Tecnología |
|---|---|
| Framework | React 18 + Vite 8 |
| Lenguaje | TypeScript 5 |
| Routing | React Router DOM 7 |
| Datos del servidor | TanStack Query v5 |
| Formularios y validación | React Hook Form + Zod |
| Estilos | Tailwind CSS 3.4, con tokens de diseño propios |
| Componentes base | Radix UI (accesibles, sin estilo impuesto) |
| Iconos | Lucide React |
| Editores | CodeMirror 6 (código) y Blockly 12 (bloques) |
| Markdown y matemáticas | react-markdown + KaTeX |
| Pruebas | Vitest 2, React Testing Library, MSW 2 (simulación de la API) |
| Calidad | ESLint (0 advertencias), SonarQube, cobertura v8 |

---

## Requisitos

- **Node.js 20 o superior** (la imagen Docker y el CI usan Node 20).
- **npm** (incluido con Node).
- Opcional: **Docker**, para construir y servir la imagen de producción.

---

## Puesta en marcha

```bash
# 1. Clonar e instalar dependencias (usa package-lock.json)
git clone <url-del-repositorio>
cd training-and-judge-center-frontend
npm ci

# 2. Crear la configuración local (opcional; ver Variables de entorno)
cp .env.development .env.development.local   # solo si necesitas sobrescribir algo

# 3. Arrancar el servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173`. Con los valores por defecto de `.env.development` la aplicación arranca con **datos simulados**, así que no necesitas el backend para explorarla.

Para conectarla al backend real, pon `VITE_ENABLE_MOCKS=false` en `.env.development.local` y apunta `VITE_API_URL` a tu servidor (por defecto `http://localhost:8080/api`).

---

## Variables de entorno

Vite lee estas variables en tiempo de construcción. Todas empiezan con `VITE_` porque son públicas: **nunca pongas secretos aquí**.

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api` | URL base de la API del backend. |
| `VITE_ENABLE_MOCKS` | `true` (en `.env.development`) | Activa los datos simulados con MSW para todos los módulos. |
| `VITE_MOCK_<MÓDULO>` | — | Sobrescribe el valor global para un módulo: `AUTH`, `USERS`, `DASHBOARD`, `GROUPS`, `PROBLEMS`, `SUBMISSIONS`, `CONTESTS`, `MATERIALS`, `TEAMS`. Solo aplica si `VITE_ENABLE_MOCKS=true`. |
| `VITE_GOOGLE_CLIENT_ID` | — | Identificador de cliente de Google para el inicio de sesión. Debe coincidir con el del backend, y `http://localhost:5173` debe estar autorizado como origen en Google Cloud Console. |

La configuración local va en `.env.development.local`, que está ignorado por git.

---

## Datos simulados (mocks)

Con `VITE_ENABLE_MOCKS=true`, MSW intercepta las peticiones HTTP en el navegador y responde con datos de `src/mocks/`. Así se puede desarrollar y revisar la interfaz sin backend, y las pruebas de integración usan el mismo mecanismo.

- Los manejadores están separados por módulo en `src/mocks/handlers/`.
- Los datos de ejemplo están en `src/mocks/data.ts`.
- Un módulo puede volver al backend real con `VITE_MOCK_<MÓDULO>=false` aunque el resto siga simulado.

---

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite con recarga en caliente. |
| `npm run build` | Comprueba tipos con `tsc` y genera el build de producción en `dist/`. |
| `npm run preview` | Sirve localmente el build de `dist/` para revisarlo. |
| `npm run lint` | ESLint sobre todo el proyecto. **Falla con cualquier advertencia** (`--max-warnings 0`). |
| `npm run test` | Vitest en modo interactivo (watch). |
| `npm run test:run` | Todas las pruebas una vez. |
| `npm run test:unit` | Solo el proyecto *unit* (páginas, componentes, hooks, utilidades). |
| `npm run test:integration` | Solo el proyecto *integration* (flujos completos con la aplicación montada). |
| `npm run test:coverage` | Todas las pruebas con cobertura. Falla si baja del 80 %. |
| `npm run test:ui` | Interfaz gráfica de Vitest en el navegador. |

---

## Pruebas

La estrategia y las convenciones están en [`docs/TESTING_STANDARDS.md`](docs/TESTING_STANDARDS.md). En resumen:

- **Unitarias** (`*.test.ts` / `*.test.tsx`), junto al código que prueban: componentes, páginas, hooks, funciones puras y clientes de la API.
- **De integración** (`src/integration/*.integration.test.tsx`): montan el árbol real de la aplicación con MSW. Se mantienen pocas, rápidas y sin esperas reales, para no alargar el CI.
- **Cobertura**: el umbral es **80 %** en líneas, ramas, funciones y sentencias. Lo que se excluye (por ejemplo, el punto de entrada y los tipos) está listado en `vitest.config.ts`.
- **Regla del proyecto**: todo cambio de comportamiento lleva su prueba. Los refactors se protegen con *pruebas de caracterización*: se escriben contra el código original y deben seguir pasando después del cambio.

Las utilidades compartidas de prueba viven en `src/test/` (por ejemplo, `hookHarness.ts` y `renderWithProviders.tsx`).

---

## Calidad de código

- **ESLint** con reglas de React Hooks, React Refresh y TypeScript. El CI rechaza cualquier advertencia.
- **TypeScript estricto**: `npm run build` ejecuta `tsc` antes de empaquetar.
- **SonarQube** (`sonar-project.properties`): análisis estático de las fuentes en `src/`, excluyendo pruebas, mocks y la capa de integración. La cobertura se importa desde `coverage/lcov.info`.
  - En Windows, las rutas del reporte pueden llevar `\`; hay que normalizarlas antes de escanear, o ejecutar el análisis desde Linux o CI.
  - El análisis se hace contra un SonarQube local (Docker); no hay un servidor compartido.
- **Accesibilidad**: los componentes de Radix UI aportan roles y navegación por teclado; el resto se revisa con pruebas de roles accesibles.

---

## Arquitectura

La aplicación sigue una separación por capas:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Cliente HTTP | `src/api/client.ts` | `fetch` con token Bearer automático, subidas con progreso (XHR) y errores tipados (`ApiClientError`). |
| Funciones de API | `src/api/*.ts` | Una por recurso: problemas, concursos, envíos, grupos, equipos, materiales, usuarios. |
| Hooks de datos | `src/hooks/api/use*.ts` | Consultas y mutaciones con TanStack Query. Cada recurso exporta su *fábrica de claves* para invalidar la caché. |
| Autenticación | `src/components/layout/AuthProvider.tsx` | Expone `user`, `isAuthenticated`, `hasRole()` y `logout()` mediante `useAuth()`. |
| Rutas | `src/AppRoutes.tsx` | Rutas centralizadas. `<ProtectedRoute roles={[…]}>` restringe por rol. |
| Primitivas de UI | `src/components/ui/` | Botón, campo, tarjeta, diálogo, tabla, paginación, etc. Se exportan desde un barril `index.ts`. |
| Componentes de dominio | `src/components/features/` | Piezas con lógica de negocio: tarjetas de problema, panel de validación, registro de equipos, editor de bloques. |
| Páginas | `src/pages/<dominio>/` | Orquestan hooks y componentes. Cada página se divide en subcomponentes y hooks con nombre. |
| Constantes | `src/lib/constants.ts` | Rutas (`ROUTES`, `PATHS`), lenguajes, estados y configuración de roles. |

**Convenciones importantes:**

- Las rutas se referencian siempre con `ROUTES.*` o `PATHS.*`, nunca con cadenas literales.
- Los errores de la API se muestran al usuario con `useToastContext()`.
- Los estilos condicionales se combinan con `cn()` (`src/lib/utils.ts`).
- El alias `@/` apunta a `src/`.
- La caché de TanStack Query usa `staleTime` de 5 minutos, `retry: 1` y no revalida al enfocar la ventana.

---

## Estructura del proyecto

```
src/
├── api/                 Cliente HTTP y funciones por recurso
├── assets/              Imágenes y recursos estáticos
├── components/
│   ├── features/        Componentes de dominio (con lógica de negocio)
│   ├── layout/          AppLayout, Navbar, Sidebar, proveedores de contexto
│   ├── patterns/        Plantillas reutilizables (listado, formulario, detalle)
│   └── ui/              Primitivas (botón, campo, diálogo, tabla…)
├── hooks/               Hooks generales y hooks de datos (hooks/api/)
├── integration/         Pruebas de integración (flujos completos)
├── lib/                 Constantes, utilidades, esquemas Zod, reglas de dominio
├── mocks/               Datos simulados y manejadores MSW
├── pages/               Páginas por dominio (admin, problems, contests, groups…)
├── test/                Utilidades compartidas para las pruebas
├── types/               Tipos TypeScript por recurso
└── workers/             Web Worker de Pyodide (ejecución de Python en el navegador)
```

Otros archivos relevantes en la raíz:

- `vite.config.ts`, `vitest.config.ts`, `vitest.workspace.ts`: build y pruebas.
- `tailwind.config.js`: tokens de diseño (colores de marca, estados, radios, sombras).
- `Dockerfile`: imagen de producción con Nginx y soporte de rutas de SPA.
- `vercel.json`: configuración de Vercel, con reescritura a `index.html`.
- `sonar-project.properties`: configuración del análisis de SonarQube.

---

## Roles y rutas

| Rol | Puede |
|---|---|
| `CONTESTANT` | Ver problemas publicados, enviar soluciones, inscribirse a concursos, usar equipos y ver su tablero. |
| `COACH` | Todo lo anterior, y crear y editar problemas y concursos de los grupos que lidera. |
| `ADMIN` | Todo lo anterior, y gestionar usuarios y rejuzgamientos globales. |

Además del rol del sistema, dentro de cada grupo existe un rol de **miembro** o **líder**. Muchas acciones dependen de ser líder del grupo que organiza el concurso, no solo de tener el rol `COACH`: el frontend lo refleja, y el backend hace la comprobación definitiva.

Las rutas principales (las completas están en `src/lib/constants.ts`):

| Ruta | Página |
|---|---|
| `/login`, `/register`, `/recover-password` | Acceso y recuperación de cuenta |
| `/dashboard` | Tablero personal |
| `/problems`, `/problems/:slug` | Listado y detalle de problemas |
| `/problems/:slug/edit`, `/problems/new` | Edición de problemas (`ADMIN`, `COACH`) |
| `/groups`, `/groups/:id` | Grupos y su detalle |
| `/groups/:groupId/contests/:id` | Detalle del concurso (con sus tres estados: programado, en curso, finalizado) |
| `/groups/:groupId/contests/:contestId/problems/:letter` | Problema dentro de un concurso |
| `/groups/:groupId/materials` | Material del grupo |
| `/submit` | Envío de solución |
| `/admin/users` | Gestión de usuarios (`ADMIN`) |

---

## Despliegue

El repositorio tiene tres caminos de despliegue:

1. **Vercel**: `vercel.json` ignora las construcciones que no vienen de `main` o `develop`.
2. **Docker**: el `Dockerfile` construye con Node 20 y sirve `dist/` con Nginx, redirigiendo las rutas de la SPA a `index.html`.

   ```bash
   docker build -t training-frontend .
   docker run -p 8080:80 training-frontend
   ```

3. **GitHub Actions** (`.github/workflows/`):
   - `ci.yml`: en cada PR hacia `develop` o `main`, instala dependencias, ejecuta el lint, las pruebas con cobertura (umbral 80 %) y el build. Sube el reporte de cobertura como artefacto.
   - `cd.yml`: en cada push a `main` o `develop`, construye la imagen Docker y la publica en el registro de GitHub Container Registry (`ghcr.io`), etiquetada con el nombre de la rama y el SHA del commit.
   - `claude-review.yml`: flujo de revisión asistida por Claude, activado por comentarios de revisión en los PR.

Para producción, las variables `VITE_*` se fijan en el momento de construir la imagen: un cambio de API requiere reconstruir.

---

## Contribuir

1. Crea la rama desde `develop` actualizado: `git checkout develop && git pull --ff-only && git checkout -b <tipo>/<descripcion>`.
2. Haz los cambios con sus pruebas. Antes de abrir el PR, ejecuta:
   ```bash
   npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
   ```
3. Abre el PR **hacia `develop`** (nunca directo a `main`) usando la plantilla `.github/PULL_REQUEST_TEMPLATE.md`. Completa todas sus secciones.
4. Espera a que pase el CI y atiende los comentarios de revisión.

**Commits:** se sigue la convención [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/): `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, con un ámbito opcional, por ejemplo `fix(contests): …`.

**Antes de tocar código**, lee [`CLAUDE.md`](CLAUDE.md) (guía para el trabajo asistido por IA en este repositorio) y [`docs/TESTING_STANDARDS.md`](docs/TESTING_STANDARDS.md).

---

## Documentación adicional

| Documento | Contenido |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Comandos, arquitectura y convenciones del proyecto. |
| [`docs/TESTING_STANDARDS.md`](docs/TESTING_STANDARDS.md) | Cómo escribir y organizar las pruebas. |
| [`docs/patterns.md`](docs/patterns.md) | Patrones de página y de componente. |
| [`docs/design-tokens.md`](docs/design-tokens.md) | Tokens de color, tipografía y espaciado. |
| [`docs/stack.md`](docs/stack.md) | Decisiones de tecnología. |
