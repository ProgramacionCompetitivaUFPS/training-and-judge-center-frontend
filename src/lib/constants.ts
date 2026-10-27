import type { UserRole } from '@/types/user'
import type { BadgeProps } from '@/components/ui/Badge'

export const ROLE_CONFIG = {
  ADMIN: { label: 'Administrador', badgeVariant: 'default' },
  COACH: { label: 'Coach', badgeVariant: 'primary' },
  CONTESTANT: { label: 'Competidor', badgeVariant: 'outline' },
} as const satisfies Record<UserRole, { label: string; badgeVariant: BadgeProps['variant'] }>

export const DIFFICULTY_COLORS = {
  easy: {
    bg: 'bg-status-success/10',
    text: 'text-status-success',
    border: 'border-status-success',
  },
  medium: {
    bg: 'bg-brand-primary-muted',
    text: 'text-brand-primary',
    border: 'border-brand-primary',
  },
  hard: {
    bg: 'bg-brand-accent-muted',
    text: 'text-brand-accent',
    border: 'border-brand-accent',
  },
} as const

export const SUBMISSION_STATUS_CONFIG = {
  ACCEPTED: { label: 'Aceptado', color: 'success' },
  WRONG_ANSWER: { label: 'Respuesta Incorrecta', color: 'error' },
  TIME_LIMIT_EXCEEDED: { label: 'Tiempo Límite Excedido', color: 'warning' },
  MEMORY_LIMIT_EXCEEDED: { label: 'Memoria Límite Excedida', color: 'warning' },
  OUTPUT_LIMIT_EXCEEDED: { label: 'Salida Límite Excedida', color: 'warning' },
  RUNTIME_ERROR: { label: 'Error en Tiempo de Ejecución', color: 'error' },
  COMPILATION_ERROR: { label: 'Error de Compilación', color: 'error' },
  PENDING: { label: 'Pendiente', color: 'default' },
  RUNNING: { label: 'Ejecutando', color: 'default' },
  SYSTEM_ERROR: { label: 'Error del Sistema', color: 'error' },
} as const

export const PROGRAMMING_LANGUAGES = [
  { value: 'cpp20', label: 'C++ 20' },
  { value: 'java17', label: 'Java 17' },
  { value: 'python310', label: 'Python 3.10' },
  { value: 'blockly', label: 'Blockly' },
] as const

/** Syntax mode shared by the editor (CodeMirror) and the viewer (highlight.js). */
export type CodeMode = 'cpp' | 'java' | 'python'

export interface JudgeLanguageConfig {
  /** Sent with the submission; must match the backend's language validator. */
  compiler: string
  /** Extension of the file built from the editor's code. */
  fileExtension: string
  /** Extensions accepted (and auto-detected) when uploading a file. */
  accept: readonly string[]
  mode: CodeMode
  /** Starting code when the language is picked over an empty editor. */
  template: string
}

/**
 * Everything the UI needs per judge language, in one place: adding a language means adding one
 * entry here (plus the label above). Java's class must be Solution: the judge compiles the source
 * as Solution.java and runs `java Solution` (judge_config.yaml).
 */
export const JUDGE_LANGUAGES: Record<'cpp20' | 'java17' | 'python310', JudgeLanguageConfig> = {
  cpp20: {
    compiler: 'g++',
    fileExtension: 'cpp',
    accept: ['.cpp', '.cc', '.cxx'],
    mode: 'cpp',
    template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    \n    return 0;\n}\n',
  },
  java17: {
    compiler: 'javac',
    fileExtension: 'java',
    accept: ['.java'],
    mode: 'java',
    template: 'import java.io.*;\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) throws IOException {\n        \n    }\n}\n',
  },
  python310: {
    // Not "python3": the backend's language_validator.go expects "py" and answers COMPILER_MISMATCH otherwise.
    compiler: 'py',
    fileExtension: 'py',
    accept: ['.py'],
    mode: 'python',
    template: 'import sys\n\n\ndef main():\n    \n\n\nif __name__ == "__main__":\n    main()\n',
  },
}

export function judgeLanguage(language: string): JudgeLanguageConfig | undefined {
  return (JUDGE_LANGUAGES as Record<string, JudgeLanguageConfig>)[language]
}

/** Syntax mode for a submission language; Blockly submissions are stored as generated Python. */
export function codeModeOf(language: string): CodeMode | undefined {
  return language === 'blockly' ? 'python' : judgeLanguage(language)?.mode
}

/** Judge language for an uploaded file name, by extension (e.g. "sol.py" → "python310"). */
export function languageForFilename(filename: string): string | undefined {
  const ext = '.' + (filename.split('.').pop() ?? '').toLowerCase()
  return Object.entries(JUDGE_LANGUAGES).find(([, cfg]) => cfg.accept.includes(ext))?.[0]
}

/** True when the code is one of the untouched starter templates. */
export function isLanguageTemplate(code: string): boolean {
  return Object.values(JUDGE_LANGUAGES).some((cfg) => cfg.template === code)
}

/** Judge language used when submitting a Blockly solution (Blockly compiles to Python). */
export const BLOCKLY_JUDGE_LANGUAGE = 'python310' as const

// Neither the backend nor the create/import flows apply any default when these are left
// blank — they just stay null until someone fills them in (and they're required to publish).
// Most simple problems keep these as-is, so the create/edit forms pre-fill them instead of
// leaving the fields empty.
export const DEFAULT_PROBLEM_TIME_LIMIT_MS = 1000
export const DEFAULT_PROBLEM_MEMORY_LIMIT_MB = 256

export const MARKDOWN_SYNTAX_GUIDE_URL =
  'https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax'
export const LATEX_SYNTAX_GUIDE_URL = 'https://katex.org/docs/supported.html'

// Shown by default when creating a problem, so a first-time author sees the Markdown + LaTeX
// rendering (remark-gfm, remark-math/rehype-katex, syntax highlighting) work immediately
// instead of facing an empty textarea. Meant to be overwritten with the real statement.
export const DEFAULT_PROBLEM_STATEMENT_MARKDOWN = [
  `> 💡 Este es un enunciado de ejemplo para mostrarte el formato soportado (Markdown + LaTeX). Reemplázalo por el enunciado real. Guías de sintaxis: [Markdown](${MARKDOWN_SYNTAX_GUIDE_URL}) · [LaTeX (KaTeX)](${LATEX_SYNTAX_GUIDE_URL}).`,
  '',
  '## Descripción',
  '',
  'Dado un arreglo de $n$ enteros, encuentra la suma máxima de un **subarreglo contiguo** (no vacío).',
  '',
  'Formalmente, calcula:',
  '',
  '$$',
  '\\max_{1 \\le i \\le j \\le n} \\sum_{k=i}^{j} a_k',
  '$$',
  '',
  '## Entrada',
  '',
  '- La primera línea contiene un entero $n$ ($1 \\le n \\le 10^5$).',
  '- La segunda línea contiene $n$ enteros $a_1, a_2, \\dots, a_n$ ($-10^9 \\le a_i \\le 10^9$).',
  '',
  '## Salida',
  '',
  'Imprime un único entero: la suma máxima encontrada.',
  '',
  '> 💡 Los ejemplos de entrada/salida no se escriben aquí: se muestran automáticamente a',
  '> partir de los archivos que subas en `data/sample/` dentro del ZIP de "Casos de prueba".',
  '',
  'También puedes incluir bloques de código con resaltado de sintaxis:',
  '',
  '```python',
  'def ejemplo():',
  '    return "funciona"',
  '```',
].join('\n')

// Same idea as DEFAULT_PROBLEM_STATEMENT_MARKDOWN but framed as generic study content
// (no Entrada/Salida), plus a note about the video-embed feature that's specific to materials.
export const DEFAULT_MATERIAL_CONTENT_MARKDOWN = [
  `> 💡 Este es un contenido de ejemplo para mostrarte el formato soportado (Markdown + LaTeX). Reemplázalo por el contenido real. Guías de sintaxis: [Markdown](${MARKDOWN_SYNTAX_GUIDE_URL}) · [LaTeX (KaTeX)](${LATEX_SYNTAX_GUIDE_URL}).`,
  '',
  '## Título de la sección',
  '',
  'Puedes usar **negrita**, *cursiva*, listas y fórmulas matemáticas como $E = mc^2$.',
  '',
  '- Primer punto',
  '- Segundo punto',
  '',
  '| Concepto | Complejidad |',
  '|---|---|',
  '| Búsqueda binaria | $O(\\log n)$ |',
  '| Ordenamiento | $O(n \\log n)$ |',
  '',
  '```python',
  'def ejemplo():',
  '    return "funciona"',
  '```',
  '',
  'También puedes pegar un enlace de YouTube o Vimeo y se incrusta automáticamente como video.',
].join('\n')

// Source-file extensions the backend maps to a supported judging language
// (config/virtual_object.json → languageExtensions). Checker/validator/solution
// uploads must be one of these; anything else is rejected before it's even sent.
export const PROBLEM_SOURCE_FILE_EXTENSIONS = ['.cpp', '.py', '.java'] as const

// Mirrors config/virtual_object.json's languageExtensions map — used by the mocks to derive
// a solution/checker/validator's language from its filename the same way the backend does.
export const PROBLEM_LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.cpp': 'cpp20',
  '.py': 'python310',
  '.java': 'java17',
}

export const PROBLEM_FILE_TYPE_INFO = {
  testCases: {
    label: 'Casos de prueba',
    accept: '.zip',
    extensions: ['.zip'],
    help: 'ZIP con estructura ICPC: pares de archivos .in/.ans dentro de data/sample/ (se muestran automáticamente como ejemplos en el enunciado) y data/secret/ (casos reales de evaluación, nunca visibles). Tamaño máximo: 200 MB.',
    example: 'casos.zip\n└── data/\n    ├── sample/\n    │   ├── 1.in\n    │   └── 1.ans\n    └── secret/\n        ├── 1.in\n        ├── 1.ans\n        ├── 2.in\n        └── 2.ans',
  },
  checker: {
    label: 'Checker',
    accept: PROBLEM_SOURCE_FILE_EXTENSIONS.join(','),
    extensions: PROBLEM_SOURCE_FILE_EXTENSIONS,
    help: 'Un único archivo de código fuente que compara la salida del participante contra la respuesta esperada (C++20, Python 3.10 o Java 17). Tamaño máximo: 2 MB.',
    example: 'checker.cpp',
  },
  validator: {
    label: 'Validator',
    accept: PROBLEM_SOURCE_FILE_EXTENSIONS.join(','),
    extensions: PROBLEM_SOURCE_FILE_EXTENSIONS,
    help: 'Un único archivo de código fuente que valida que cada caso de entrada cumpla el formato del enunciado, antes de juzgar (C++20, Python 3.10 o Java 17). Tamaño máximo: 2 MB.',
    example: 'validator.cpp',
  },
  solution: {
    label: 'Solución',
    accept: PROBLEM_SOURCE_FILE_EXTENSIONS.join(','),
    extensions: PROBLEM_SOURCE_FILE_EXTENSIONS,
    help: 'Un archivo de código fuente por solución de referencia (C++20, Python 3.10 o Java 17). Puedes subir varias, por ejemplo una óptima y otra de fuerza bruta. Tamaño máximo: 2 MB.',
    example: 'solucion_optima.cpp',
  },
} as const satisfies Record<string, { label: string; accept: string; extensions: readonly string[]; help: string; example: string }>

export const CONTEST_STATUS_CONFIG = {
  SCHEDULED: { label: 'Programado', color: 'default' },
  ACTIVE: { label: 'En curso', color: 'success' },
  FINISHED: { label: 'Finalizado', color: 'outline' },
} as const

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RECOVER_PASSWORD: '/recover-password',
  DASHBOARD: '/dashboard',
  PROBLEMS: '/problems',
  PROBLEM_DETAIL: '/problems/:slug',
  PROBLEM_NEW: '/problems/new',
  PROBLEM_EDIT: '/problems/:slug/edit',
  PROBLEM_STATISTICS: '/problems/:slug/statistics',
  PROBLEM_SUBMISSIONS: '/problems/:slug/submissions',
  PROBLEM_SOLUTION_FILE: '/problems/:slug/files/solution/:fileName',
  PROBLEM_JUDGING_FILE: '/problems/:slug/files/:fileType',
  PROBLEM_TESTCASES: '/problems/:slug/testcases',
  PROBLEM_TESTCASE: '/problems/:slug/testcases/:kind/:name',
  GROUPS: '/groups',
  GROUP_NEW: '/groups/new',
  GROUP_DETAIL: '/groups/:id',
  GROUP_EDIT: '/groups/:id/edit',
  GROUP_ACCEPT_INVITATION: '/groups/:groupId/invitations/:invitationId/accept',
  CONTESTS: '/contests',
  CONTEST_NEW: '/groups/:groupId/contests/new',
  CONTEST_DETAIL: '/groups/:groupId/contests/:id',
  CONTEST_EDIT: '/groups/:groupId/contests/:id/edit',
  CONTEST_STANDINGS: '/groups/:groupId/contests/:id/standings',
  CONTEST_SUBMISSIONS: '/groups/:groupId/contests/:id/submissions',
  CONTEST_PARTICIPANTS: '/groups/:groupId/contests/:id/participants',
  CONTEST_PROBLEM: '/groups/:groupId/contests/:contestId/problems/:letter',
  MATERIALS: '/groups/:groupId/materials',
  MATERIAL_NEW: '/groups/:groupId/materials/new',
  MATERIAL_DETAIL: '/groups/:groupId/materials/:materialId',
  MATERIAL_EDIT: '/groups/:groupId/materials/:materialId/edit',
  SUBMIT_SOLUTION: '/submit',
  CONTEST_SUBMIT: '/groups/:groupId/contests/:contestId/submit',
  SUBMISSIONS: '/submissions',
  SUBMISSION_DETAIL: '/submissions/:id',
  TEAMS: '/teams',
  TEAM_DETAIL: '/teams/:teamId',
  PROFILE: '/profile',
  PROFILE_PUBLIC: '/users/:nickname',
  SETTINGS: '/settings',
  ADMIN_USERS: '/admin/users',
} as const

export const PATHS = {
  // Groups
  group: (id: string) => `/groups/${id}`,
  groupEdit: (id: string) => `/groups/${id}/edit`,
  groupAcceptInvitation: (groupId: string, invitationId: string) => `/groups/${groupId}/invitations/${invitationId}/accept`,
  // Contests
  contest: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}`,
  contestNew: (groupId: string) => `/groups/${groupId}/contests/new`,
  contestEdit: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/edit`,
  contestStandings: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/standings`,
  contestSubmissions: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/submissions`,
  contestParticipants: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/participants`,
  contestProblem: (groupId: string, contestId: string, letter: string) =>
    `/groups/${groupId}/contests/${contestId}/problems/${letter}`,
  contestSubmit: (groupId: string, contestId: string, problem?: string) =>
    `/groups/${groupId}/contests/${contestId}/submit${problem ? `?problem=${problem}` : ''}`,
  // Problems
  problem: (slug: string) => `/problems/${slug}`,
  problemEdit: (slug: string) => `/problems/${slug}/edit`,
  problemSubmissions: (slug: string) => `/problems/${slug}/submissions`,
  // The problem's page already on its files tab (what the file pages go back to)
  problemFiles: (slug: string) => `/problems/${slug}?tab=files`,
  // Full-file views (real URLs, so they open in a new tab)
  problemTestCases: (slug: string) => `/problems/${slug}/testcases`,
  problemSolutionFile: (slug: string, fileName: string) => `/problems/${slug}/files/solution/${encodeURIComponent(fileName)}`,
  problemJudgingFile: (slug: string, fileType: 'checker' | 'validator') => `/problems/${slug}/files/${fileType}`,
  problemTestCase: (slug: string, kind: 'sample' | 'secret', name: string) => `/problems/${slug}/testcases/${kind}/${encodeURIComponent(name)}`,
  // Submissions
  submission: (id: string) => `/submissions/${id}`,
  // Materials
  materials: (groupId: string) => `/groups/${groupId}/materials`,
  materialNew: (groupId: string) => `/groups/${groupId}/materials/new`,
  material: (groupId: string, materialId: string) => `/groups/${groupId}/materials/${materialId}`,
  materialEdit: (groupId: string, materialId: string) => `/groups/${groupId}/materials/${materialId}/edit`,
}
