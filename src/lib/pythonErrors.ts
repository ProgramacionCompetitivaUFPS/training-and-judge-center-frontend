type Explainer = (message: string) => string | null

/** int() rejects «1.5» as well, so the sentence has to say which kind of number the block wanted. */
function explainNumberConversion(message: string): string | null {
  const integer = /invalid literal for int\(\) with base 10: '(.*)'/.exec(message)
  const decimal = /could not convert string to float: '(.*)'/.exec(message)
  const number = integer ?? decimal
  if (!number) return null

  const value = number[1]
  const noun = integer ? 'número entero' : 'número'
  if (/\s/.test(value.trim())) {
    return `Se esperaba un solo ${noun}, pero la línea trae varios valores («${value}»). Si los valores vienen juntos en una línea, usa «leer línea de…» en vez de «leer».`
  }
  if (value.trim() === '') {
    return `Se esperaba un ${noun}, pero la línea de la entrada está vacía. Revisa que la entrada tenga todos los datos.`
  }
  return `Se esperaba un ${noun}, pero llegó «${value}».`
}

function explainUndefinedName(message: string): string | null {
  const name = /name '(.+)' is not defined/.exec(message)?.[1]
  return name ? `La variable «${name}» se usa antes de darle un valor.` : null
}

function explainMixedTypes(message: string): string | null {
  const mixesTypes = /unsupported operand|can only concatenate|must be str, not|not supported between/.test(message)
  return mixesTypes ? 'Se mezclaron valores de tipos distintos, por ejemplo un número con un texto.' : null
}

const always = (sentence: string): Explainer => () => sentence

// A Map, not an object: an error type called "constructor" must not reach Object.prototype
const EXPLAINERS = new Map<string, Explainer>([
  ['ValueError', explainNumberConversion],
  ['EOFError', always('El programa pidió más datos de los que hay en la entrada. Revisa que la entrada tenga todas las líneas que se leen.')],
  ['ZeroDivisionError', always('Hay una división entre cero.')],
  ['IndexError', always('Se pidió un elemento de la lista que no existe: la lista tiene menos elementos de los esperados.')],
  ['NameError', explainUndefinedName],
  ['RecursionError', always('Hay demasiadas llamadas de una función a sí misma sin terminar.')],
  ['TypeError', explainMixedTypes],
])

/** A traceback ends with "ErrorType: message" on its last line. */
function parseLastLine(text: string): { type: string; message: string } | null {
  const last = text.split('\n').filter((l) => l.trim()).pop() ?? ''
  const match = /^([A-Za-z]+(?:Error|Exit)?):\s*(.*)$/.exec(last.trim()) ?? /^(EOFError)$/.exec(last.trim())
  if (!match) return null
  const [, type, message = ''] = match
  return { type, message }
}

/**
 * Turns the error Python printed into a sentence a person using the block editor can act on.
 * Returns null when the error is not one of the common ones, so the caller shows it as it came.
 *
 * The block editor generates the Python, so the mistakes that happen are almost always about the
 * input: a block that reads a number from a line that holds several, or reads more than there is.
 */
export function explainPythonError(stderr: string): string | null {
  const text = stderr.trim()
  if (!text) return null

  // The worker reports a run that did not finish in time with its own message, not a traceback
  if (/^Tiempo límite excedido$/i.test(text)) {
    return 'El programa tardó más de 5 segundos. Revisa si hay un ciclo que no termina.'
  }

  const parsed = parseLastLine(text)
  if (!parsed) return null
  return EXPLAINERS.get(parsed.type)?.(parsed.message) ?? null
}
