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

  // A traceback ends with "ErrorType: message" on its last line
  const last = text.split('\n').filter((l) => l.trim()).pop() ?? ''
  const match = /^([A-Za-z]+(?:Error|Exit)?):\s*(.*)$/.exec(last.trim()) ?? /^(EOFError)$/.exec(last.trim())
  if (!match) return null
  const [, type, message = ''] = match

  if (type === 'ValueError') {
    const number = /invalid literal for int\(\) with base 10: '(.*)'/.exec(message) ?? /could not convert string to float: '(.*)'/.exec(message)
    if (number) {
      const value = number[1]
      if (/\s/.test(value.trim())) {
        return `Se esperaba un solo número, pero la línea trae varios valores («${value}»). Si los valores vienen juntos en una línea, usa «leer línea de…» en vez de «leer».`
      }
      if (value.trim() === '') return 'Se esperaba un número, pero la línea de la entrada está vacía. Revisa que la entrada tenga todos los datos.'
      return `Se esperaba un número, pero llegó «${value}».`
    }
  }
  if (type === 'EOFError') {
    return 'El programa pidió más datos de los que hay en la entrada. Revisa que la entrada tenga todas las líneas que se leen.'
  }
  if (type === 'ZeroDivisionError') return 'Hay una división entre cero.'
  if (type === 'IndexError') return 'Se pidió un elemento de la lista que no existe: la lista tiene menos elementos de los esperados.'
  if (type === 'NameError') {
    const name = /name '(.+)' is not defined/.exec(message)?.[1]
    if (name) return `La variable «${name}» se usa antes de darle un valor.`
  }
  if (type === 'RecursionError') return 'Hay demasiadas llamadas de una función a sí misma sin terminar.'
  if (type === 'TypeError' && /unsupported operand|can only concatenate|must be str, not|not supported between/.test(message)) {
    return 'Se mezclaron valores de tipos distintos, por ejemplo un número con un texto.'
  }
  return null
}
