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
  maxTotalBytes: 100 * 1024 * 1024, // maxFileSizeTestCaseMB
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

/** Reads the three keys the importer uses from problem.yaml (top level only). */
export function parseProblemYaml(text: string): { name?: string; timeLimit?: string; memoryLimit?: string } {
  const out: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const m = /^(name|time_limit|memory_limit)\s*:\s*(.*?)\s*$/.exec(raw) // top level: no indentation
    if (!m) continue
    let value = m[2]
    const quoted = /^(["'])(.*)\1/.exec(value)
    if (quoted) value = quoted[2]
    else value = value.replace(/\s+#.*$/, '') // a trailing comment
    out[m[1]] = value
  }
  return { name: out.name, timeLimit: out.time_limit, memoryLimit: out.memory_limit }
}

export async function reviewProblemPackage(file: File): Promise<PackageReview> {
  const findings: PackageFinding[] = []
  const summary: PackageSummary = { hasStatement: false, sampleCases: 0, secretCases: 0, solutions: [], rootFolder: '' }
  const error = (message: string, hint?: string) => findings.push({ level: 'error', message, hint })
  const warn = (message: string, hint?: string) => findings.push({ level: 'warning', message, hint })
  const finish = (): PackageReview => ({ findings, summary, canImport: !findings.some((f) => f.level === 'error') })

  let entries: Entry[]
  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(file)
    entries = Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => ({
        path: f.name.replace(/\\/g, '/').replace(/^\.\//, ''),
        // JSZip keeps the uncompressed size on an internal field; absent, the size checks are skipped
        size: (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize,
        read: () => f.async('string'),
      }))
      .filter((e) => !e.path.includes('__MACOSX') && !e.path.endsWith('.DS_Store'))
  } catch {
    error('El archivo no se pudo leer como un ZIP.', 'Comprueba que no esté corrupto y que sea un .zip (no .rar ni .7z).')
    return finish()
  }

  // ---- where the package is: the folder holding problem.yaml ----
  const yamls = entries.filter((e) => base(e.path).toLowerCase() === 'problem.yaml')
  const roots = [...new Set(yamls.map((e) => dir(e.path)))]
  if (yamls.length === 0) {
    error('No hay ningún problem.yaml.', 'Es el archivo que describe el problema (su nombre y límites). Debe estar en la raíz del paquete.')
    const hasDataFolder = entries.some((e) => /(^|\/)data\/(sample|secret)\//.test(e.path))
    if (hasDataFolder) warn('Sí encontré carpetas data/sample o data/secret, pero sin problem.yaml no se pueden importar.')
    return finish()
  }
  if (roots.length > 1) {
    error(`Hay más de un problema dentro del ZIP (problem.yaml en: ${roots.map((r) => r || '/').join(', ')}).`, 'Un ZIP es un solo problema. Sube cada uno por separado.')
    return finish()
  }
  const root = roots[0]
  const prefix = root ? `${root}/` : ''
  summary.rootFolder = root

  const inside = entries.filter((e) => e.path.startsWith(prefix))
  const rel = (e: Entry) => e.path.slice(prefix.length)
  const outside = entries.length - inside.length
  if (outside > 0) warn(`${outside} archivo${outside === 1 ? '' : 's'} fuera de la carpeta del problema (${root}/) se ignoran.`)

  // ---- limits on the whole package ----
  if (inside.length > PACKAGE_LIMITS.maxFiles) {
    error(`El ZIP tiene ${inside.length.toLocaleString('es')} archivos y el máximo es ${PACKAGE_LIMITS.maxFiles.toLocaleString('es')}.`)
  }
  const total = inside.reduce((sum, e) => sum + (e.size ?? 0), 0)
  if (total > PACKAGE_LIMITS.maxTotalBytes) {
    error(`El paquete descomprimido pesa ${(total / 1024 / 1024).toFixed(0)} MB y el máximo es ${PACKAGE_LIMITS.maxTotalBytes / 1024 / 1024} MB.`)
  }

  // ---- problem.yaml ----
  const yamlEntry = yamls[0]
  if ((yamlEntry.size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) error('problem.yaml pesa más de 2 MB.')
  const meta = parseProblemYaml(await yamlEntry.read())
  if (!meta.name) {
    error('problem.yaml no tiene el campo name.', 'Agrega una línea como: name: "Suma de dos números". Es el título del problema.')
  } else {
    summary.title = meta.name
  }
  if (meta.timeLimit === undefined) {
    warn('problem.yaml no tiene time_limit.', 'Tendrás que definir el límite de tiempo antes de poder publicar.')
  } else {
    const seconds = Number(meta.timeLimit)
    if (!Number.isFinite(seconds) || seconds <= 0) {
      error(`time_limit «${meta.timeLimit}» no es un número positivo.`, 'Va en segundos, por ejemplo: time_limit: 2')
    } else if (seconds > PACKAGE_LIMITS.maxTimeSeconds) {
      error(
        `time_limit ${seconds} es demasiado grande: el máximo son ${PACKAGE_LIMITS.maxTimeSeconds} segundos.`,
        seconds >= 100 ? '¿Lo escribiste en milisegundos? En problem.yaml va en segundos (time_limit: 2 son 2 s).' : undefined,
      )
    } else {
      summary.timeLimitSeconds = seconds
    }
  }
  if (meta.memoryLimit === undefined) {
    warn('problem.yaml no tiene memory_limit.', 'Tendrás que definir el límite de memoria antes de poder publicar.')
  } else {
    const mb = Number(meta.memoryLimit)
    if (!Number.isInteger(mb) || mb <= 0) {
      error(`memory_limit «${meta.memoryLimit}» no es un entero positivo.`, 'Va en MB, por ejemplo: memory_limit: 256')
    } else if (mb > PACKAGE_LIMITS.maxMemoryMb) {
      error(`memory_limit ${mb} es demasiado grande: el máximo son ${PACKAGE_LIMITS.maxMemoryMb} MB.`, mb > 65_536 ? '¿Lo escribiste en bytes o KB? Va en MB.' : undefined)
    } else {
      summary.memoryLimitMb = mb
    }
  }

  // ---- statement ----
  const statement = inside.find((e) => rel(e).toLowerCase() === STATEMENT_PATH)
  if (statement) {
    summary.hasStatement = true
    if ((statement.size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) error('El enunciado pesa más de 2 MB.')
    const text = await statement.read()
    // The platform shows the statement as Markdown with $...$ formulas, whatever the file extension says.
    if (/\\(section|subsection|begin\{|end\{|textbf|emph|item)\b/.test(text)) {
      warn(
        'El enunciado parece estar escrito en LaTeX (\\section, \\begin, \\textbf…).',
        'La plataforma lo muestra como Markdown con fórmulas entre $…$; esos comandos aparecerían tal cual. Escríbelo en Markdown (## Entrada, **negrita**).',
      )
    }
  } else {
    const others = inside.filter((e) => /^problem_statement\//.test(rel(e)))
    warn(
      'No hay enunciado: el importador solo lee problem_statement/problem.en.tex.',
      others.length
        ? `Encontré ${others.map((e) => rel(e)).join(', ')}, pero no se importa. Renómbralo a ${STATEMENT_PATH}, o escríbelo después en el formulario.`
        : 'Puedes escribirlo después en el formulario.',
    )
  }

  // ---- test cases ----
  const caseFiles = { sample: [] as Entry[], secret: [] as Entry[] }
  const nested: string[] = []
  for (const e of inside) {
    const m = /^data\/(sample|secret)\/(.+)$/.exec(rel(e))
    if (!m) continue
    if (m[2].includes('/')) nested.push(rel(e))
    else caseFiles[m[1] as 'sample' | 'secret'].push(e)
  }
  const misplaced = [...new Set(inside.map(rel).filter((p) => /^(sample|secret)s?\//.test(p)).map((p) => p.split('/')[0]))]
  if (misplaced.length) {
    warn(
      `Las carpetas ${misplaced.map((m) => `${m}/`).join(' y ')} no están dentro de data/: no se importan.`,
      'Los casos van en data/sample/ (ejemplos) y data/secret/ (secretos).',
    )
  }
  if (nested.length) {
    warn(
      `Hay ${nested.length} archivo${nested.length === 1 ? '' : 's'} en subcarpetas de data/ (por ejemplo ${nested[0]}): se ignoran.`,
      'Los casos van directamente en data/sample/ o data/secret/, sin subcarpetas.',
    )
  }

  for (const kind of ['sample', 'secret'] as const) {
    const byName = new Map<string, Set<string>>()
    for (const e of caseFiles[kind]) {
      const e2 = ext(e.path)
      const name = base(rel(e)).slice(0, base(rel(e)).length - e2.length)
      if (e2 !== '.in' && e2 !== '.ans') {
        error(
          `data/${kind}/${base(e.path)} no es un caso: solo se admiten archivos .in y .ans.`,
          e2 === '.out' ? 'Renombra los .out a .ans (la respuesta esperada).' : 'Quítalo de data/ o muévelo fuera del paquete.',
        )
        continue
      }
      if ((e.size ?? 0) > (e2 === '.in' ? PACKAGE_LIMITS.maxInputBytes : PACKAGE_LIMITS.maxAnswerBytes)) {
        error(`data/${kind}/${base(e.path)} pesa ${(e.size! / 1024 / 1024).toFixed(1)} MB y el máximo para un ${e2} es ${(e2 === '.in' ? PACKAGE_LIMITS.maxInputBytes : PACKAGE_LIMITS.maxAnswerBytes) / 1024 / 1024} MB.`)
      }
      byName.set(name, (byName.get(name) ?? new Set()).add(e2))
    }
    const unpaired = [...byName].filter(([, kinds]) => kinds.size < 2)
    if (unpaired.length) {
      warn(
        `En data/${kind}/ ${unpaired.length === 1 ? 'falta el par de' : 'faltan los pares de'}: ${unpaired.slice(0, 5).map(([n, k]) => `${n}${k.has('.in') ? '.in (sin .ans)' : '.ans (sin .in)'}`).join(', ')}${unpaired.length > 5 ? '…' : ''}.`,
        'Cada caso necesita su entrada (.in) y su respuesta (.ans) con el mismo nombre.',
      )
    }
    summary[kind === 'sample' ? 'sampleCases' : 'secretCases'] = [...byName].filter(([, kinds]) => kinds.size === 2).length
  }
  if (caseFiles.sample.length > PACKAGE_LIMITS.maxSampleFiles) {
    error(
      `Hay ${caseFiles.sample.length} archivos en data/sample/ y el máximo son ${PACKAGE_LIMITS.maxSampleFiles} (cuentan .in y .ans, o sea ${PACKAGE_LIMITS.maxSampleFiles / 2} ejemplos).`,
      'Deja en data/sample/ solo los ejemplos del enunciado; el resto va en data/secret/.',
    )
  }
  if (caseFiles.sample.length + caseFiles.secret.length === 0) {
    warn('El paquete no trae casos de prueba.', 'Podrás subirlos después, pero hacen falta antes de publicar.')
  } else if (caseFiles.sample.length === 0) {
    warn('No hay ejemplos en data/sample/.', 'La página del problema no mostrará ningún ejemplo.')
  }

  // ---- solutions ----
  const solutionFiles = inside.filter((e) => rel(e).startsWith('solutions/'))
  const ignoredSolutions: string[] = []
  for (const e of solutionFiles) {
    if (SOURCE_EXTENSIONS.includes(ext(e.path))) {
      summary.solutions.push(rel(e).slice('solutions/'.length))
      if ((e.size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) error(`${rel(e)} pesa más de 2 MB.`)
    } else {
      ignoredSolutions.push(rel(e))
    }
  }
  if (ignoredSolutions.length) {
    warn(
      `${ignoredSolutions.length} archivo${ignoredSolutions.length === 1 ? '' : 's'} de solutions/ se ignoran por su extensión (${ignoredSolutions.slice(0, 3).join(', ')}${ignoredSolutions.length > 3 ? '…' : ''}).`,
      `Solo se importan ${SOURCE_EXTENSIONS.join(', ')}.`,
    )
  }
  if (summary.solutions.length === 0) warn('No hay soluciones de referencia.', 'Se necesita al menos una para poder publicar; la puedes subir después.')

  // ---- checker and validator ----
  for (const kind of ['checker', 'validator'] as const) {
    const found = inside.filter((e) => {
      const r = rel(e)
      return !r.includes('/') && r.slice(0, r.length - ext(r).length).toLowerCase() === kind && ext(r) !== ''
    })
    if (found.length > 1) {
      error(`Hay más de un ${kind} en la raíz (${found.map((f) => rel(f)).join(', ')}).`, 'Deja uno solo; si hay más de un archivo que coincida, el importador rechaza todo el paquete.')
    } else if (found.length === 1) {
      const name = rel(found[0])
      if (!VERIFIER_EXTENSIONS.includes(ext(name))) {
        error(`${name} no es un ${kind} válido: solo se admiten ${VERIFIER_EXTENSIONS.join(' y ')}.`)
      } else {
        summary[kind] = name
        if ((found[0].size ?? 0) > PACKAGE_LIMITS.maxAuxBytes) error(`${name} pesa más de 2 MB.`)
      }
    }
  }
  const kattis = [...new Set(inside.map(rel).filter((p) => /^(output|input)_validators\//.test(p)).map((p) => p.split('/')[0]))]
  if (kattis.length) {
    warn(
      `${kattis.map((k) => `${k}/`).join(' y ')} no se importa${kattis.length > 1 ? 'n' : ''}.`,
      'Esta plataforma lee el checker y el validador como checker.cpp / checker.py y validator.cpp / validator.py en la raíz del paquete.',
    )
  }

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
