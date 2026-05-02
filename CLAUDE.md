# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint (0 warnings allowed — CI enforces this)
npm run preview   # Preview production build locally
```

There is no test runner configured yet. No `*.test.ts` or `*.spec.ts` files exist.

CI runs on PRs to `develop`: install → lint → build.

## Architecture

**React 18 SPA** for a competitive programming platform (contests, problems, submissions, groups, teams, materials). TypeScript 5, Vite 8, React Router DOM 7, TanStack Query v5, Tailwind CSS 3.4, Radix UI primitives, React Hook Form + Zod.

### Layer overview

| Layer | Location | Responsibility |
|---|---|---|
| API client | `src/api/client.ts` | Custom fetch wrapper; auto-injects Bearer token from `localStorage.auth_token`; throws `ApiClientError` |
| API functions | `src/api/*.ts` | One file per resource (problems, contests, submissions, groups, teams, materials, users) |
| Query hooks | `src/hooks/api/use*.ts` | TanStack Query hooks; each resource has a key factory + hooks for queries and mutations |
| Auth | `src/components/layout/AuthProvider.tsx` | Context provider; `useAuth()` exposes `user`, `isAuthenticated`, `hasRole()`, `logout()` |
| Routing | `src/App.tsx` | Centralized routes; `<ProtectedRoute roles={[...]}>` for role-based access |
| UI primitives | `src/components/ui/` | Reusable base components (Button, Input, Card, Dialog, Tabs, etc.) — exported via barrel `index.ts` |
| Feature components | `src/components/features/` | Domain-specific components (ProblemCard, BlocklyEditor, ContestCountdown, etc.) |
| Layout | `src/components/layout/` | AppLayout (Navbar + Sidebar + Breadcrumbs), AuthLayout, ToastProvider, ContestSessionProvider |
| Pages | `src/pages/<domain>/` | One folder per domain; page components orchestrate hooks + components |
| Types | `src/types/` | One file per resource + `api.ts` for generic types (PaginatedResponse, etc.) |
| Constants | `src/lib/constants.ts` | Route paths (`ROUTES.*`), `DIFFICULTY_COLORS`, `SUBMISSION_STATUS_CONFIG`, `PROGRAMMING_LANGUAGES` |
| Utils | `src/lib/utils.ts` | `cn()` (clsx + tailwind-merge), `formatDateTz()`, `formatDuration()` |
| Mocks | `src/mocks/` | MSW v2; `handlers/` split by feature; toggled via env vars |

### Key patterns

**Query key factory** — every resource hook file exports a keys object:
```typescript
export const problemKeys = {
  all: ['problems'] as const,
  list: (params) => ['problems', 'list', params] as const,
  detail: (slug) => ['problems', 'detail', slug] as const,
}
```
Mutations invalidate using these keys. Default config: `staleTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`.

**Path alias** — `@/*` maps to `./src/*` in both TypeScript and Vite.

**Route constants** — always reference `ROUTES.*` from `src/lib/constants.ts` instead of string literals.

**Role-based routing** — wrap page routes with `<ProtectedRoute roles={['ADMIN', 'COACH']}>`. Roles: `ADMIN`, `COACH`, `CONTESTANT`.

**Error handling** — API errors are `ApiClientError` instances with `status`, `code`, `message`, and field-level `details`. Surface errors to users via `useToastContext()`.

### Environment & mocking

Development uses `.env.development`:
```
VITE_ENABLE_MOCKS=true          # enable MSW globally
VITE_API_URL=http://localhost:8080/api
VITE_MOCK_<MODULE>=true         # per-module mock override
```
Local overrides go in `.env.development.local` (git-ignored). MSW is initialized in `main.tsx` before React renders.

### Styling

Tailwind with custom tokens defined in `tailwind.config.js`:
- **Brand**: `primary` (#e11d48 rose), `accent` (#d97706 amber)
- **Status**: `success` (#059669), `error` (#b91c1c), `warning` (#d97706)
- **Semantic surfaces**: `background`, `surface`, `border`, `text-primary`, `text-muted`, `text-inverse`
- **Typography**: Inter (sans), JetBrains Mono (mono)
- **Radii**: `sm` 6px, `md` 12px, `lg` 24px, `pill` 9999px
- **Shadows**: `elevation-1/2/3`

Use `cn()` from `src/lib/utils.ts` for conditional class merging.

### Special subsystems

- **Blockly** (`src/components/features/BlocklyEditor.tsx`) — visual programming editor for Python via Pyodide (`src/hooks/usePyodide.ts`)
- **Math rendering** — KaTeX via React Markdown + remark/rehype plugins for problem statements
- **Contest sessions** — time-limited contest state in `ContestSessionProvider`
