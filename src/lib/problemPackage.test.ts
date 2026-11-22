import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'

import {
  PACKAGE_LIMITS,
  parseProblemYaml,
  reviewProblemPackage,
  buildPackageTemplate,
  type PackageReview,
} from './problemPackage'

const MB = 1024 * 1024

const VALID_PACKAGE: Record<string, string> = {
  'problem.yaml': 'name: "Suma"\ntime_limit: 2\nmemory_limit: 256\n',
  'problem_statement/problem.en.tex': 'Suma dos números.',
  'data/sample/1.in': '1 2\n',
  'data/sample/1.ans': '3\n',
  'data/secret/1.in': '5 5\n',
  'data/secret/1.ans': '10\n',
  'solutions/sol.cpp': 'int main(){}',
}

async function zipFile(files: Record<string, string>): Promise<File> {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) zip.file(name, content)
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], 'problem.zip')
}

async function review(files: Record<string, string>): Promise<PackageReview> {
  return reviewProblemPackage(await zipFile(files))
}

function messages(result: PackageReview, level: 'error' | 'warning') {
  return result.findings.filter((f) => f.level === level).map((f) => f.message)
}

/** The valid package with some entries replaced; a null value removes the entry. */
function variant(changes: Record<string, string | null>): Record<string, string> {
  const files = { ...VALID_PACKAGE }
  for (const [name, content] of Object.entries(changes)) {
    if (content === null) delete files[name]
    else files[name] = content
  }
  return files
}

describe('PACKAGE_LIMITS', () => {
  it('maxTotalBytes es 150 MB', () => {
    expect(PACKAGE_LIMITS.maxTotalBytes).toBe(150 * 1024 * 1024)
  })
  it('maxInputBytes es 64 MB', () => {
    expect(PACKAGE_LIMITS.maxInputBytes).toBe(64 * 1024 * 1024)
  })
  it('maxAnswerBytes es 8 MB', () => {
    expect(PACKAGE_LIMITS.maxAnswerBytes).toBe(8 * 1024 * 1024)
  })
  it('maxAuxBytes es 2 MB', () => {
    expect(PACKAGE_LIMITS.maxAuxBytes).toBe(2 * 1024 * 1024)
  })
})

describe('parseProblemYaml', () => {
  it('lee name, time_limit y memory_limit del nivel superior', () => {
    expect(parseProblemYaml('name: Suma\ntime_limit: 2\nmemory_limit: 256\n')).toEqual({
      name: 'Suma',
      timeLimit: '2',
      memoryLimit: '256',
    })
  })

  it.each([
    ['name: "Suma de dos"', 'Suma de dos'],
    ["name: 'Suma de dos'", 'Suma de dos'],
    ['name: Suma de dos   # el título', 'Suma de dos'],
    ['name:Suma', 'Suma'],
  ])('interpreta el valor de %s como %j', (line, expected) => {
    expect(parseProblemYaml(line).name).toBe(expected)
  })

  it.each([
    ['name: Suma # uno # dos', 'Suma'],
    ['name: Suma#no es comentario', 'Suma#no es comentario'],
    ['name: a#b #c', 'a#b'],
    ['name: 	 Suma 	  ', 'Suma'],
    ['name: "Suma # no se corta"', 'Suma # no se corta'],
    ['name:   ', ''],
  ])('interpreta el valor de %j como %j (comentarios y espacios)', (line, expected) => {
    expect(parseProblemYaml(line).name).toBe(expected)
  })

  it('no se bloquea con líneas enormes de espacios (tiempo lineal)', () => {
    const spaces = ' '.repeat(300_000)
    const start = performance.now()

    const parsed = parseProblemYaml(`name: a${spaces}b
time_limit: 2${spaces}# c
memory_limit: ${spaces}x`)

    expect(performance.now() - start).toBeLessThan(1000)
    expect(parsed.name).toBe(`a${spaces}b`)
    expect(parsed.timeLimit).toBe('2')
  })

  it('no se bloquea con espacios seguidos de un separador de línea raro dentro del valor (tiempo lineal)', () => {
    // U+2028 is a line terminator for `.` but is not split by the importer's \r?\n, so it can sit inside a "line"
    const lineSeparator = String.fromCharCode(0x2028)
    const start = performance.now()

    const parsed = parseProblemYaml(`name:${' '.repeat(300_000)}x${lineSeparator}y\ntime_limit: 3`)

    expect(performance.now() - start).toBeLessThan(1000)
    expect(parsed.name).toBeUndefined()
    expect(parsed.timeLimit).toBe('3')
  })

  it('ignora las claves con sangría y las que no usa el importador', () => {
    const yaml = 'author: Ana\nlimits:\n  time_limit: 9\n  memory_limit: 9\nname: Suma\n'

    expect(parseProblemYaml(yaml)).toEqual({ name: 'Suma', timeLimit: undefined, memoryLimit: undefined })
  })

  it('acepta saltos de línea de Windows', () => {
    expect(parseProblemYaml('name: Suma\r\ntime_limit: 3\r\n').timeLimit).toBe('3')
  })

  it('devuelve todo undefined con un texto vacío', () => {
    expect(parseProblemYaml('')).toEqual({ name: undefined, timeLimit: undefined, memoryLimit: undefined })
  })
})

describe('reviewProblemPackage', () => {
  it('acepta sin hallazgos un paquete completo y resume su contenido', async () => {
    const result = await review(VALID_PACKAGE)

    expect(result.canImport).toBe(true)
    expect(result.findings).toEqual([])
    expect(result.summary).toEqual({
      title: 'Suma',
      timeLimitSeconds: 2,
      memoryLimitMb: 256,
      hasStatement: true,
      sampleCases: 1,
      secretCases: 1,
      solutions: ['sol.cpp'],
      rootFolder: '',
    })
  })

  it('rechaza con un error claro un archivo que no es un ZIP', async () => {
    const result = await reviewProblemPackage(new File(['esto no es un zip'], 'x.zip'))

    expect(result.canImport).toBe(false)
    expect(messages(result, 'error')).toEqual(['El archivo no se pudo leer como un ZIP.'])
  })

  describe('ubicación del problema', () => {
    it('reporta que falta problem.yaml y avisa si hay carpetas data/', async () => {
      const result = await review(variant({ 'problem.yaml': null }))

      expect(result.canImport).toBe(false)
      expect(messages(result, 'error')).toEqual(['No hay ningún problem.yaml.'])
      expect(messages(result, 'warning')).toEqual([
        'Sí encontré carpetas data/sample o data/secret, pero sin problem.yaml no se pueden importar.',
      ])
    })

    it('rechaza un ZIP con más de un problema y los lista', async () => {
      const result = await review({
        'a/problem.yaml': 'name: A\n',
        'b/problem.yaml': 'name: B\n',
      })

      expect(result.canImport).toBe(false)
      expect(messages(result, 'error')).toEqual([
        'Hay más de un problema dentro del ZIP (problem.yaml en: a, b).',
      ])
    })

    it('usa la carpeta de problem.yaml como raíz e ignora y avisa de lo que queda fuera', async () => {
      const files: Record<string, string> = { 'otro/notas.txt': 'x' }
      for (const [name, content] of Object.entries(VALID_PACKAGE)) files[`prob/${name}`] = content

      const result = await review(files)

      expect(result.summary.rootFolder).toBe('prob')
      expect(result.canImport).toBe(true)
      expect(messages(result, 'warning')).toEqual(['1 archivo fuera de la carpeta del problema (prob/) se ignoran.'])
    })

    it('ignora los archivos residuales de macOS', async () => {
      const result = await review({
        ...VALID_PACKAGE,
        '__MACOSX/._problem.yaml': 'basura',
        '.DS_Store': 'basura',
        'data/sample/._1.in': 'basura',
      })

      expect(result.findings).toEqual([])
    })
  })

  describe('problem.yaml', () => {
    it('es un error que falte name', async () => {
      const result = await review(variant({ 'problem.yaml': 'time_limit: 2\nmemory_limit: 256\n' }))

      expect(result.canImport).toBe(false)
      expect(messages(result, 'error')).toEqual(['problem.yaml no tiene el campo name.'])
      expect(result.summary.title).toBeUndefined()
    })

    it('avisa (sin bloquear) cuando faltan time_limit y memory_limit', async () => {
      const result = await review(variant({ 'problem.yaml': 'name: Suma\n' }))

      expect(result.canImport).toBe(true)
      expect(messages(result, 'warning')).toEqual([
        'problem.yaml no tiene time_limit.',
        'problem.yaml no tiene memory_limit.',
      ])
    })

    it.each([
      ['abc', 'time_limit «abc» no es un número positivo.'],
      ['0', 'time_limit «0» no es un número positivo.'],
      ['-3', 'time_limit «-3» no es un número positivo.'],
      ['601', 'time_limit 601 es demasiado grande: el máximo son 600 segundos.'],
    ])('rechaza time_limit %s', async (value, expected) => {
      const result = await review(variant({ 'problem.yaml': `name: Suma\ntime_limit: ${value}\nmemory_limit: 256\n` }))

      expect(messages(result, 'error')).toEqual([expected])
      expect(result.summary.timeLimitSeconds).toBeUndefined()
    })

    it('sugiere que quizá se escribió en milisegundos cuando time_limit supera el máximo', async () => {
      const result = await review(variant({ 'problem.yaml': 'name: Suma\ntime_limit: 2000\nmemory_limit: 256\n' }))

      expect(result.findings[0].hint).toBe('¿Lo escribiste en milisegundos? En problem.yaml va en segundos (time_limit: 2 son 2 s).')
    })

    it('acepta el límite máximo de tiempo de 600 segundos', async () => {
      const result = await review(variant({ 'problem.yaml': 'name: Suma\ntime_limit: 600\nmemory_limit: 256\n' }))

      expect(result.summary.timeLimitSeconds).toBe(600)
      expect(result.canImport).toBe(true)
    })

    it.each([
      ['abc', 'memory_limit «abc» no es un entero positivo.'],
      ['1.5', 'memory_limit «1.5» no es un entero positivo.'],
      ['0', 'memory_limit «0» no es un entero positivo.'],
      ['2049', 'memory_limit 2049 es demasiado grande: el máximo son 2048 MB.'],
    ])('rechaza memory_limit %s', async (value, expected) => {
      const result = await review(variant({ 'problem.yaml': `name: Suma\ntime_limit: 2\nmemory_limit: ${value}\n` }))

      expect(messages(result, 'error')).toEqual([expected])
      expect(result.summary.memoryLimitMb).toBeUndefined()
    })

    it('sugiere bytes o KB cuando memory_limit supera 65536', async () => {
      const result = await review(variant({ 'problem.yaml': 'name: Suma\ntime_limit: 2\nmemory_limit: 268435456\n' }))

      expect(result.findings[0].hint).toBe('¿Lo escribiste en bytes o KB? Va en MB.')
    })

    it('rechaza un problem.yaml de más de 2 MB', async () => {
      const padding = `# ${'x'.repeat(2 * MB)}\n`
      const result = await review(variant({ 'problem.yaml': `name: Suma\ntime_limit: 2\nmemory_limit: 256\n${padding}` }))

      expect(messages(result, 'error')).toEqual(['problem.yaml pesa más de 2 MB.'])
    })
  })

  describe('enunciado', () => {
    it('avisa cuando el enunciado está escrito en LaTeX', async () => {
      const result = await review(variant({ 'problem_statement/problem.en.tex': '\\section{Entrada}\nDos enteros.' }))

      expect(result.canImport).toBe(true)
      expect(messages(result, 'warning')).toEqual([
        'El enunciado parece estar escrito en LaTeX (\\section, \\begin, \\textbf…).',
      ])
    })

    it('no avisa por un enunciado en Markdown con fórmulas', async () => {
      const result = await review(variant({ 'problem_statement/problem.en.tex': '## Entrada\nDos enteros $a$ y $b$.' }))

      expect(result.findings).toEqual([])
    })

    it('avisa cuando no hay enunciado y sugiere renombrar el que sí encontró', async () => {
      const result = await review(variant({ 'problem_statement/problem.en.tex': null, 'problem_statement/problem.es.tex': 'hola' }))

      expect(result.summary.hasStatement).toBe(false)
      expect(result.findings[0].message).toBe('No hay enunciado: el importador solo lee problem_statement/problem.en.tex.')
      expect(result.findings[0].hint).toBe(
        'Encontré problem_statement/problem.es.tex, pero no se importa. Renómbralo a problem_statement/problem.en.tex, o escríbelo después en el formulario.',
      )
    })

    it('avisa sin sugerencia de renombrar cuando no hay ningún archivo de enunciado', async () => {
      const result = await review(variant({ 'problem_statement/problem.en.tex': null }))

      expect(result.findings[0].hint).toBe('Puedes escribirlo después en el formulario.')
    })

    it('rechaza un enunciado de más de 2 MB', async () => {
      const result = await review(variant({ 'problem_statement/problem.en.tex': 'x'.repeat(2 * MB + 1) }))

      expect(messages(result, 'error')).toEqual(['El enunciado pesa más de 2 MB.'])
    })
  })

  describe('casos de prueba', () => {
    it('rechaza archivos que no son .in ni .ans y sugiere renombrar los .out', async () => {
      const result = await review(variant({ 'data/secret/1.out': '10\n' }))

      expect(result.canImport).toBe(false)
      expect(result.findings[0]).toEqual({
        level: 'error',
        message: 'data/secret/1.out no es un caso: solo se admiten archivos .in y .ans.',
        hint: 'Renombra los .out a .ans (la respuesta esperada).',
      })
    })

    it('rechaza otros archivos en data/ con la sugerencia de quitarlos', async () => {
      const result = await review(variant({ 'data/sample/notas.txt': 'x' }))

      expect(result.findings[0].hint).toBe('Quítalo de data/ o muévelo fuera del paquete.')
    })

    it('avisa de los casos que no tienen su par .in/.ans y solo cuenta los completos', async () => {
      const result = await review(variant({ 'data/secret/2.in': '7 7\n', 'data/secret/3.ans': '0\n' }))

      expect(result.summary.secretCases).toBe(1)
      expect(messages(result, 'warning')).toEqual([
        'En data/secret/ faltan los pares de: 2.in (sin .ans), 3.ans (sin .in).',
      ])
    })

    it('avisa con singular cuando falta el par de un solo caso', async () => {
      const result = await review(variant({ 'data/sample/2.in': '1 1\n' }))

      expect(messages(result, 'warning')).toEqual(['En data/sample/ falta el par de: 2.in (sin .ans).'])
    })

    it('rechaza más de 10 archivos en data/sample/', async () => {
      const samples: Record<string, string> = {}
      for (let i = 1; i <= 6; i += 1) {
        samples[`data/sample/${i}.in`] = '1\n'
        samples[`data/sample/${i}.ans`] = '1\n'
      }

      const result = await review(variant(samples))

      expect(messages(result, 'error')).toEqual([
        'Hay 12 archivos en data/sample/ y el máximo son 10 (cuentan .in y .ans, o sea 5 ejemplos).',
      ])
    })

    it('rechaza una respuesta .ans de más de 8 MB', async () => {
      const result = await review(variant({ 'data/secret/1.ans': 'x'.repeat(8 * MB + 1) }))

      expect(messages(result, 'error')).toEqual([
        'data/secret/1.ans pesa 8.0 MB y el máximo para un .ans es 8 MB.',
      ])
    })

    it('avisa cuando el paquete no trae ningún caso de prueba', async () => {
      const result = await review(
        variant({ 'data/sample/1.in': null, 'data/sample/1.ans': null, 'data/secret/1.in': null, 'data/secret/1.ans': null }),
      )

      expect(result.canImport).toBe(true)
      expect(messages(result, 'warning')).toEqual(['El paquete no trae casos de prueba.'])
    })

    it('avisa cuando hay casos secretos pero ningún ejemplo', async () => {
      const result = await review(variant({ 'data/sample/1.in': null, 'data/sample/1.ans': null }))

      expect(messages(result, 'warning')).toEqual(['No hay ejemplos en data/sample/.'])
    })

    it('avisa de los archivos en subcarpetas de data/ y no los cuenta como casos', async () => {
      const result = await review(variant({ 'data/secret/grupo1/1.in': '1\n' }))

      expect(result.summary.secretCases).toBe(1)
      expect(messages(result, 'warning')).toEqual([
        'Hay 1 archivo en subcarpetas de data/ (por ejemplo data/secret/grupo1/1.in): se ignoran.',
      ])
    })

    it('avisa de las carpetas sample/ y secret/ que están fuera de data/', async () => {
      const result = await review(variant({ 'sample/1.in': '1\n', 'secret/1.in': '1\n' }))

      expect(messages(result, 'warning')).toEqual([
        'Las carpetas sample/ y secret/ no están dentro de data/: no se importan.',
      ])
    })
  })

  describe('soluciones, checker y validador', () => {
    it('lista las soluciones con extensión soportada y avisa de las ignoradas', async () => {
      const result = await review(variant({ 'solutions/sol.py': 'print(1)', 'solutions/notas.txt': 'x' }))

      expect(result.summary.solutions).toEqual(['sol.cpp', 'sol.py'])
      expect(messages(result, 'warning')).toEqual([
        '1 archivo de solutions/ se ignoran por su extensión (solutions/notas.txt).',
      ])
    })

    it('avisa cuando no hay soluciones de referencia', async () => {
      const result = await review(variant({ 'solutions/sol.cpp': null }))

      expect(messages(result, 'warning')).toEqual(['No hay soluciones de referencia.'])
    })

    it('rechaza una solución de más de 2 MB', async () => {
      const result = await review(variant({ 'solutions/sol.cpp': 'x'.repeat(2 * MB + 1) }))

      expect(messages(result, 'error')).toEqual(['solutions/sol.cpp pesa más de 2 MB.'])
    })

    it.each([
      ['checker.cpp', 'checker'],
      ['checker.py', 'checker'],
      ['validator.cpp', 'validator'],
      ['validator.py', 'validator'],
    ])('reconoce %s en la raíz como %s', async (name, kind) => {
      const result = await review(variant({ [name]: 'codigo' }))

      expect(result.summary[kind as 'checker' | 'validator']).toBe(name)
      expect(result.findings).toEqual([])
    })

    it('rechaza un checker en Java', async () => {
      const result = await review(variant({ 'checker.java': 'class C {}' }))

      expect(messages(result, 'error')).toEqual(['checker.java no es un checker válido: solo se admiten .py y .cpp.'])
      expect(result.summary.checker).toBeUndefined()
    })

    it('rechaza más de un checker en la raíz', async () => {
      const result = await review(variant({ 'checker.cpp': 'a', 'checker.py': 'b' }))

      expect(messages(result, 'error')).toEqual(['Hay más de un checker en la raíz (checker.cpp, checker.py).'])
    })

    it('avisa de los validadores estilo Kattis que la plataforma no lee', async () => {
      const result = await review(variant({ 'output_validators/v/validate.cpp': 'x', 'input_validators/v/validate.py': 'x' }))

      expect(messages(result, 'warning')).toEqual(['output_validators/ y input_validators/ no se importan.'])
    })
  })
})

describe('buildPackageTemplate', () => {
  it('genera un ZIP que la propia revisión acepta sin hallazgos', async () => {
    const blob = await buildPackageTemplate('## Entrada\nDos enteros.')
    const result = await reviewProblemPackage(new File([blob], 'plantilla.zip'))

    expect(result.findings).toEqual([])
    expect(result.canImport).toBe(true)
    expect(result.summary).toEqual({
      title: 'Suma de dos números',
      timeLimitSeconds: 1,
      memoryLimitMb: 256,
      hasStatement: true,
      sampleCases: 1,
      secretCases: 2,
      solutions: ['sol.cpp'],
      rootFolder: '',
    })
  })

  it('incluye el enunciado recibido como problem_statement/problem.en.tex', async () => {
    const blob = await buildPackageTemplate('ENUNCIADO DE PRUEBA')
    const zip = await JSZip.loadAsync(blob)

    expect(await zip.file('problem_statement/problem.en.tex')?.async('string')).toBe('ENUNCIADO DE PRUEBA')
  })
})
