// Reviews an ICPC problem package in the browser before it is imported, so a problem setter finds
// out what is wrong (and what will silently be ignored) while they can still fix it, instead of
// after an upload and one error toast at a time. It mirrors what the backend's importer checks
// (internal/adapter/problem/icpc_parser.go, config/virtual_object.json); the backend stays the
// authority, this only saves the round trip. What the backend would reject is an "error"; what it
// would accept but almost certainly isn't what the author meant is a "warning".

import { PROBLEM_LANGUAGE_BY_EXTENSION } from '@/lib/constants'

export type FindingLevel = 'error' | 'warning'

export interface PackageFinding {
  level: FindingLevel
  message: string
  /** What to do about it. */
  hint?: string
}

export interface PackageSummary {
  title?: string
  timeLimitSeconds?: number
  memoryLimitMb?: number
  hasStatement: boolean
  sampleCases: number
  secretCases: number
  solutions: string[]
  checker?: string
  validator?: string
  rootFolder: string
}

export interface PackageReview {
  findings: PackageFinding[]
  summary: PackageSummary
  /** No error: the backend should accept it. */
  canImport: boolean
}

// Mirrors config/virtual_object.json
export const PACKAGE_LIMITS = {
  maxSampleFiles: 10, // maxFileCountSample: .in and .ans files both count
  maxFiles: 10_000, // maxFileCountTestCase
  maxTotalBytes: 150 * 1024 * 1024, // maxExtractedSizeMB (backend: config/virtual_object.json)
  maxInputBytes: 64 * 1024 * 1024, // maxFileSizeTestCaseInputMB
  maxAnswerBytes: 8 * 1024 * 1024, // maxFileSizeTestCaseAnswerMB
  maxAuxBytes: 2 * 1024 * 1024, // maxFileSizeDefaultMB: yaml, statement, solutions, checker, validator
  maxTimeSeconds: 600, // maxTimeLimitGlobal
  maxMemoryMb: 2048, // maxMemoryLimitGlobal
} as const

const SOURCE_EXTENSIONS = Object.keys(PROBLEM_LANGUAGE_BY_EXTENSION)
const VERIFIER_EXTENSIONS = ['.py', '.cpp'] // checker and validator: Java is rejected
const STATEMENT_PATH = 'problem_statement/problem.en.tex'

interface Entry {
  /** Path inside the ZIP, normalised. */
  path: string
  size?: number
  read: () => Promise<string>
}

const ext = (path: string) => {
  const dot = path.lastIndexOf('.')
  return dot > path.lastIndexOf('/') ? path.slice(dot).toLowerCase() : ''
}
const base = (path: string) => path.slice(path.lastIndexOf('/') + 1)
const dir = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')

/**
 * Drops a trailing YAML comment: a `#` that follows whitespace, and the whitespace before it. When the value itself
 * starts with `#` it is a comment only if spaces separated it from the colon (`name: # todo` has no value, `name:#x`
 * is not a comment).
 */
function stripTrailingComment(value: string, afterSpace: boolean): string {
  if (afterSpace && value.startsWith('#')) return ''
  let hash = value.indexOf('#')
  while (hash !== -1) {
    if (hash > 0 && /\s/.test(value[hash - 1])) return value.slice(0, hash).trimEnd()
    hash = value.indexOf('#', hash + 1)
  }
  return value
}

/** Reads the three keys the importer uses from problem.yaml (top level only). */
export function parseProblemYaml(text: string): { name?: string; timeLimit?: string; memoryLimit?: string } {
  const out: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    // Top level: no indentation. The line is trimmed first so the pattern needs no trailing `\s*$`, and the value
    // starts at a non-space (`\S`) so it never overlaps the spaces before it: both overlaps backtrack quadratically
    // on a line that is mostly spaces.
    const m = /^(name|time_limit|memory_limit)\s*:(\s*)(\S.*)?$/.exec(raw.trimEnd())
    if (!m) continue
    const [, key, gap, rawValue = ''] = m
    let value = rawValue
    const quoted = /^(["'])(.*)\1/.exec(value)
    if (quoted) value = quoted[2]
    else value = stripTrailingComment(value, gap.length > 0)
    out[key] = value
  }
  return { name: out.name, timeLimit: out.time_limit, memoryLimit: out.memory_limit }
}

/** Collects findings while the package is reviewed; each check below adds to it. */
interface Review {
  findings: PackageFinding[]
  summary: PackageSummary
  error: (message: string, hint?: string) => void
  warn: (message: string, hint?: string) => void
}

/** The files of the package folder, with their path relative to it. */
interface PackageFiles {
  inside: Entry[]
  rel: (e: Entry) => string
}

const mb = (bytes: number) => bytes / 1024 / 1024
const plural = (n: number) => (n === 1 ? '' : 's')

async function readEntries(file: File): Promise<Entry[]> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  return (
    Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => ({
        path: f.name.replace(/\\/g, '/').replace(/^\.\//, ''),
        // JSZip keeps the uncompressed size on an internal field; absent, the size checks are skipped
        size: (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize,
        read: () => f.async('string'),
      }))
      // macOS leftovers the importer ignores too: __MACOSX, .DS_Store and AppleDouble files (._name)
      .filter((e) => !e.path.includes('__MACOSX') && !e.path.endsWith('.DS_Store') && !base(e.path).startsWith('._'))
  )
}

function checkTimeLimit(review: Review, raw: string | undefined) {
  if (raw === undefined) {
    review.warn('problem.yaml no tiene time_limit.', 'Tendrás que definir el límite de tiempo antes de poder publicar.')
    return
  }
  const seconds = Number(raw)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    review.error(`time_limit «${raw}» no es un número positivo.`, 'Va en segundos, por ejemplo: time_limit: 2')
  } else if (seconds > PACKAGE_LIMITS.maxTimeSeconds) {
    review.error(
      `time_limit ${seconds} es demasiado grande: el máximo son ${PACKAGE_LIMITS.maxTimeSeconds} segundos.`,
      seconds >= 100 ? '¿Lo escribiste en milisegundos? En problem.yaml va en segundos (time_limit: 2 son 2 s).' : undefined,
    )
  } else {
    review.summary.timeLimitSeconds = seconds
  }
}

function checkMemoryLimit(review: Review, raw: string | undefined) {
  if (raw === undefined) {
    review.warn('problem.yaml no tiene memory_limit.', 'Tendrás que definir el límite de memoria antes de poder publicar.')
    return
  }
  const megabytes = Number(raw)
  if (!Number.isInteger(megabytes) || megabytes <= 0) {
    review.error(`memory_limit «${raw}» no es un entero positivo.`, 'Va en MB, por ejemplo: memory_limit: 256')
  } else if (megabytes > PACKAGE_LIMITS.maxMemoryMb) {
    review.error(
      `memory_limit ${megabytes} es demasiado grande: el máximo son ${PACKAGE_LIMITS.maxMemoryMb} MB.`,
      megabytes > 65_536 ? '¿Lo escribiste en bytes o KB? Va en MB.' : undefined,
    )
  } else {
    review.summary.memoryLimitMb = megabytes
  }
}

async function checkProblemYaml(review: Review, yamlEntry: Entry) {
  if ((yamlEntry.size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) review.error('problem.yaml pesa más de 2 MB.')
  const meta = parseProblemYaml(await yamlEntry.read())
  if (meta.name) {
    review.summary.title = meta.name
  } else {
    review.error('problem.yaml no tiene el campo name.', 'Agrega una línea como: name: "Suma de dos números". Es el título del problema.')
  }
  checkTimeLimit(review, meta.timeLimit)
  checkMemoryLimit(review, meta.memoryLimit)
}

async function checkStatement(review: Review, { inside, rel }: PackageFiles) {
  const statement = inside.find((e) => rel(e).toLowerCase() === STATEMENT_PATH)
  if (!statement) {
    const others = inside.filter((e) => /^problem_statement\//.test(rel(e)))
    review.warn(
      'No hay enunciado: el importador solo lee problem_statement/problem.en.tex.',
      others.length
        ? `Encontré ${others.map((e) => rel(e)).join(', ')}, pero no se importa. Renómbralo a ${STATEMENT_PATH}, o escríbelo después en el formulario.`
        : 'Puedes escribirlo después en el formulario.',
    )
    return
  }
  review.summary.hasStatement = true
  if ((statement.size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) review.error('El enunciado pesa más de 2 MB.')
  const text = await statement.read()
  // The platform shows the statement as Markdown with $...$ formulas, whatever the file extension says.
  if (/\\(section|subsection|begin\{|end\{|textbf|emph|item)\b/.test(text)) {
    review.warn(
      'El enunciado parece estar escrito en LaTeX (\\section, \\begin, \\textbf…).',
      'La plataforma lo muestra como Markdown con fórmulas entre $…$; esos comandos aparecerían tal cual. Escríbelo en Markdown (## Entrada, **negrita**).',
    )
  }
}

/** Files under data/sample and data/secret, plus the ones that sit in places the importer does not look. */
function collectCaseFiles({ inside, rel }: PackageFiles) {
  const caseFiles = { sample: [] as Entry[], secret: [] as Entry[] }
  const nested: string[] = []
  for (const e of inside) {
    const m = /^data\/(sample|secret)\/(.+)$/.exec(rel(e))
    if (!m) continue
    if (m[2].includes('/')) nested.push(rel(e))
    else caseFiles[m[1] as 'sample' | 'secret'].push(e)
  }
  const misplaced = [...new Set(inside.map(rel).filter((p) => /^(sample|secret)s?\//.test(p)).map((p) => p.split('/')[0]))]
  return { caseFiles, nested, misplaced }
}

/** Checks one case file's type and size; returns its extension when it is a valid .in/.ans, else null. */
function checkCaseFile(review: Review, kind: string, e: Entry): string | null {
  const extension = ext(e.path)
  if (extension !== '.in' && extension !== '.ans') {
    review.error(
      `data/${kind}/${base(e.path)} no es un caso: solo se admiten archivos .in y .ans.`,
      extension === '.out' ? 'Renombra los .out a .ans (la respuesta esperada).' : 'Quítalo de data/ o muévelo fuera del paquete.',
    )
    return null
  }
  const max = extension === '.in' ? PACKAGE_LIMITS.maxInputBytes : PACKAGE_LIMITS.maxAnswerBytes
  if ((e.size ?? 0) > max) {
    review.error(`data/${kind}/${base(e.path)} pesa ${mb(e.size!).toFixed(1)} MB y el máximo para un ${extension} es ${mb(max)} MB.`)
  }
  return extension
}

function warnMisplacedCaseFiles(review: Review, nested: string[], misplaced: string[]) {
  if (misplaced.length) {
    review.warn(
      `Las carpetas ${misplaced.map((m) => `${m}/`).join(' y ')} no están dentro de data/: no se importan.`,
      'Los casos van en data/sample/ (ejemplos) y data/secret/ (secretos).',
    )
  }
  if (nested.length) {
    review.warn(
      `Hay ${nested.length} archivo${plural(nested.length)} en subcarpetas de data/ (por ejemplo ${nested[0]}): se ignoran.`,
      'Los casos van directamente en data/sample/ o data/secret/, sin subcarpetas.',
    )
  }
}

/** Checks the files of one data/ folder and returns how many complete cases (.in + .ans) it holds. */
function checkCaseFolder(review: Review, kind: 'sample' | 'secret', folder: Entry[], rel: PackageFiles['rel']): number {
  const byName = new Map<string, Set<string>>()
  for (const e of folder) {
    const extension = ext(e.path)
    const name = base(rel(e)).slice(0, base(rel(e)).length - extension.length)
    if (checkCaseFile(review, kind, e)) byName.set(name, (byName.get(name) ?? new Set()).add(extension))
  }
  const unpaired = [...byName].filter(([, kinds]) => kinds.size < 2)
  if (unpaired.length) {
    const shown = unpaired.slice(0, 5).map(([n, k]) => `${n}${k.has('.in') ? '.in (sin .ans)' : '.ans (sin .in)'}`).join(', ')
    review.warn(
      `En data/${kind}/ ${unpaired.length === 1 ? 'falta el par de' : 'faltan los pares de'}: ${shown}${unpaired.length > 5 ? '…' : ''}.`,
      'Cada caso necesita su entrada (.in) y su respuesta (.ans) con el mismo nombre.',
    )
  }
  return [...byName].filter(([, kinds]) => kinds.size === 2).length
}

function checkCases(review: Review, files: PackageFiles) {
  const { caseFiles, nested, misplaced } = collectCaseFiles(files)
  warnMisplacedCaseFiles(review, nested, misplaced)

  review.summary.sampleCases = checkCaseFolder(review, 'sample', caseFiles.sample, files.rel)
  review.summary.secretCases = checkCaseFolder(review, 'secret', caseFiles.secret, files.rel)

  if (caseFiles.sample.length > PACKAGE_LIMITS.maxSampleFiles) {
    review.error(
      `Hay ${caseFiles.sample.length} archivos en data/sample/ y el máximo son ${PACKAGE_LIMITS.maxSampleFiles} (cuentan .in y .ans, o sea ${PACKAGE_LIMITS.maxSampleFiles / 2} ejemplos).`,
      'Deja en data/sample/ solo los ejemplos del enunciado; el resto va en data/secret/.',
    )
  }
  if (caseFiles.sample.length + caseFiles.secret.length === 0) {
    review.warn('El paquete no trae casos de prueba.', 'Podrás subirlos después, pero hacen falta antes de publicar.')
  } else if (caseFiles.sample.length === 0) {
    review.warn('No hay ejemplos en data/sample/.', 'La página del problema no mostrará ningún ejemplo.')
  }
}

function checkSolutions(review: Review, { inside, rel }: PackageFiles) {
  const ignored: string[] = []
  for (const e of inside.filter((f) => rel(f).startsWith('solutions/'))) {
    if (!SOURCE_EXTENSIONS.includes(ext(e.path))) {
      ignored.push(rel(e))
      continue
    }
    review.summary.solutions.push(rel(e).slice('solutions/'.length))
    if ((e.size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) review.error(`${rel(e)} pesa más de 2 MB.`)
  }
  if (ignored.length) {
    review.warn(
      `${ignored.length} archivo${plural(ignored.length)} de solutions/ se ignoran por su extensión (${ignored.slice(0, 3).join(', ')}${ignored.length > 3 ? '…' : ''}).`,
      `Solo se importan ${SOURCE_EXTENSIONS.join(', ')}.`,
    )
  }
  if (review.summary.solutions.length === 0) {
    review.warn('No hay soluciones de referencia.', 'Se necesita al menos una para poder publicar; la puedes subir después.')
  }
}

function checkVerifiers(review: Review, { inside, rel }: PackageFiles) {
  for (const kind of ['checker', 'validator'] as const) {
    const found = inside.filter((e) => {
      const r = rel(e)
      return !r.includes('/') && r.slice(0, r.length - ext(r).length).toLowerCase() === kind && ext(r) !== ''
    })
    if (found.length > 1) {
      review.error(
        `Hay más de un ${kind} en la raíz (${found.map((f) => rel(f)).join(', ')}).`,
        'Deja uno solo; si hay más de un archivo que coincida, el importador rechaza todo el paquete.',
      )
    } else if (found.length === 1) {
      const name = rel(found[0])
      if (!VERIFIER_EXTENSIONS.includes(ext(name))) {
        review.error(`${name} no es un ${kind} válido: solo se admiten ${VERIFIER_EXTENSIONS.join(' y ')}.`)
        continue
      }
      review.summary[kind] = name
      if ((found[0].size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) review.error(`${name} pesa más de 2 MB.`)
    }
  }
  const kattis = [...new Set(inside.map(rel).filter((p) => /^(output|input)_validators\//.test(p)).map((p) => p.split('/')[0]))]
  if (kattis.length) {
    review.warn(
      `${kattis.map((k) => `${k}/`).join(' y ')} no se importa${kattis.length > 1 ? 'n' : ''}.`,
      'Esta plataforma lee el checker y el validador como checker.cpp / checker.py y validator.cpp / validator.py en la raíz del paquete.',
    )
  }
}

/** Finds the one folder holding problem.yaml; without exactly one, the package cannot be reviewed further. */
function locatePackageRoot(review: Review, entries: Entry[]): { yamlEntry: Entry; root: string } | null {
  const yamls = entries.filter((e) => base(e.path).toLowerCase() === 'problem.yaml')
  const roots = [...new Set(yamls.map((e) => dir(e.path)))]
  if (yamls.length === 0) {
    review.error('No hay ningún problem.yaml.', 'Es el archivo que describe el problema (su nombre y límites). Debe estar en la raíz del paquete.')
    if (entries.some((e) => /(^|\/)data\/(sample|secret)\//.test(e.path))) {
      review.warn('Sí encontré carpetas data/sample o data/secret, pero sin problem.yaml no se pueden importar.')
    }
    return null
  }
  if (roots.length > 1) {
    review.error(
      `Hay más de un problema dentro del ZIP (problem.yaml en: ${roots.map((r) => r || '/').join(', ')}).`,
      'Un ZIP es un solo problema. Sube cada uno por separado.',
    )
    return null
  }
  return { yamlEntry: yamls[0], root: roots[0] }
}

function checkPackageLimits(review: Review, inside: Entry[]) {
  if (inside.length > PACKAGE_LIMITS.maxFiles) {
    review.error(`El ZIP tiene ${inside.length.toLocaleString('es')} archivos y el máximo es ${PACKAGE_LIMITS.maxFiles.toLocaleString('es')}.`)
  }
  const total = inside.reduce((sum, e) => sum + (e.size ?? 0), 0)
  if (total > PACKAGE_LIMITS.maxTotalBytes) {
    review.error(`El paquete descomprimido pesa ${mb(total).toFixed(0)} MB y el máximo es ${mb(PACKAGE_LIMITS.maxTotalBytes)} MB.`)
  }
}

export async function reviewProblemPackage(file: File): Promise<PackageReview> {
  const findings: PackageFinding[] = []
  const summary: PackageSummary = { hasStatement: false, sampleCases: 0, secretCases: 0, solutions: [], rootFolder: '' }
  const review: Review = {
    findings,
    summary,
    error: (message, hint) => findings.push({ level: 'error', message, hint }),
    warn: (message, hint) => findings.push({ level: 'warning', message, hint }),
  }
  const finish = (): PackageReview => ({ findings, summary, canImport: !findings.some((f) => f.level === 'error') })

  let entries: Entry[]
  try {
    entries = await readEntries(file)
  } catch {
    review.error('El archivo no se pudo leer como un ZIP.', 'Comprueba que no esté corrupto y que sea un .zip (no .rar ni .7z).')
    return finish()
  }

  const located = locatePackageRoot(review, entries)
  if (!located) return finish()
  const { yamlEntry, root } = located
  const prefix = root ? `${root}/` : ''
  summary.rootFolder = root

  const inside = entries.filter((e) => e.path.startsWith(prefix))
  const files: PackageFiles = { inside, rel: (e) => e.path.slice(prefix.length) }
  const outside = entries.length - inside.length
  if (outside > 0) review.warn(`${outside} archivo${plural(outside)} fuera de la carpeta del problema (${root}/) se ignoran.`)

  checkPackageLimits(review, inside)
  await checkProblemYaml(review, yamlEntry)
  await checkStatement(review, files)
  checkCases(review, files)
  checkSolutions(review, files)
  checkVerifiers(review, files)

  return finish()
}

/** A starter package that imports as is: the quickest way to get the layout right. */
export async function buildPackageTemplate(statementMarkdown: string): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('problem.yaml', 'name: "Suma de dos números"\ntime_limit: 1   # segundos\nmemory_limit: 256   # MB\n')
  zip.file(STATEMENT_PATH, statementMarkdown)
  zip.file('data/sample/1.in', '3 5\n')
  zip.file('data/sample/1.ans', '8\n')
  zip.file('data/secret/1.in', '1000000 1000000\n')
  zip.file('data/secret/1.ans', '2000000\n')
  zip.file('data/secret/2.in', '-5 5\n')
  zip.file('data/secret/2.ans', '0\n')
  zip.file(
    'solutions/sol.cpp',
    '#include <iostream>\nint main() {\n    long long a, b;\n    std::cin >> a >> b;\n    std::cout << a + b << "\\n";\n}\n',
  )
  zip.file(
    'LEEME.txt',
    [
      'Paquete de ejemplo para importar un problema.',
      '',
      '  problem.yaml                       name (obligatorio), time_limit (segundos), memory_limit (MB)',
      `  ${STATEMENT_PATH}   enunciado. Aunque diga .tex, se muestra como Markdown con fórmulas $...$`,
      '  data/sample/                       ejemplos que se muestran en el problema (hasta 10 archivos)',
      '  data/secret/                       casos que solo ve el juez',
      '  solutions/                         soluciones de referencia (.cpp, .py, .java)',
      '  checker.cpp | checker.py           opcional: verificador de respuestas propio (raíz del paquete)',
      '  validator.cpp | validator.py       opcional: validador de las entradas (raíz del paquete)',
      '',
      'Cada caso son dos archivos con el mismo nombre: 1.in (entrada) y 1.ans (respuesta esperada).',
      'Borra este archivo si quieres; no se importa.',
    ].join('\n'),
  )
  return zip.generateAsync({ type: 'blob' })
}
