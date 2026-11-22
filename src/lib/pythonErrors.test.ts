import { describe, it, expect } from 'vitest'

import { explainPythonError } from './pythonErrors'

function traceback(lastLine: string): string {
  return `Traceback (most recent call last):\n  File "<exec>", line 3, in <module>\n${lastLine}\n`
}

describe('explainPythonError', () => {
  it.each([[''], ['   \n  ']])('devuelve null cuando no hay texto de error (%j)', (stderr) => {
    expect(explainPythonError(stderr)).toBeNull()
  })

  it('explica el mensaje propio del worker cuando la ejecución no terminó a tiempo', () => {
    expect(explainPythonError('Tiempo límite excedido')).toBe(
      'El programa tardó más de 5 segundos. Revisa si hay un ciclo que no termina.',
    )
  })

  it.each([
    [
      "ValueError: invalid literal for int() with base 10: '1 2 3'",
      'Se esperaba un solo número entero, pero la línea trae varios valores («1 2 3»). Si los valores vienen juntos en una línea, usa «leer línea de…» en vez de «leer».',
    ],
    [
      "ValueError: could not convert string to float: '1.5 2'",
      'Se esperaba un solo número, pero la línea trae varios valores («1.5 2»). Si los valores vienen juntos en una línea, usa «leer línea de…» en vez de «leer».',
    ],
    [
      "ValueError: invalid literal for int() with base 10: ''",
      'Se esperaba un número entero, pero la línea de la entrada está vacía. Revisa que la entrada tenga todos los datos.',
    ],
    [
      "ValueError: could not convert string to float: ''",
      'Se esperaba un número, pero la línea de la entrada está vacía. Revisa que la entrada tenga todos los datos.',
    ],
    ["ValueError: invalid literal for int() with base 10: 'abc'", 'Se esperaba un número entero, pero llegó «abc».'],
    ["ValueError: invalid literal for int() with base 10: '1.5'", 'Se esperaba un número entero, pero llegó «1.5».'],
  ])('traduce el ValueError de conversión numérica %j', (lastLine, expected) => {
    expect(explainPythonError(traceback(lastLine))).toBe(expected)
  })

  it.each([
    ['EOFError: EOF when reading a line'],
    ['EOFError'],
  ])('explica que el programa pidió más datos de los que hay (%s)', (lastLine) => {
    expect(explainPythonError(traceback(lastLine))).toBe(
      'El programa pidió más datos de los que hay en la entrada. Revisa que la entrada tenga todas las líneas que se leen.',
    )
  })

  it.each([
    ['ZeroDivisionError: division by zero', 'Hay una división entre cero.'],
    [
      'IndexError: list index out of range',
      'Se pidió un elemento de la lista que no existe: la lista tiene menos elementos de los esperados.',
    ],
    ["NameError: name 'total' is not defined", 'La variable «total» se usa antes de darle un valor.'],
    [
      'RecursionError: maximum recursion depth exceeded',
      'Hay demasiadas llamadas de una función a sí misma sin terminar.',
    ],
    [
      "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
      'Se mezclaron valores de tipos distintos, por ejemplo un número con un texto.',
    ],
    [
      'TypeError: can only concatenate str (not "int") to str',
      'Se mezclaron valores de tipos distintos, por ejemplo un número con un texto.',
    ],
    [
      "TypeError: '<' not supported between instances of 'int' and 'str'",
      'Se mezclaron valores de tipos distintos, por ejemplo un número con un texto.',
    ],
  ])('traduce %s', (lastLine, expected) => {
    expect(explainPythonError(traceback(lastLine))).toBe(expected)
  })

  it.each([
    ['KeyError: 3'],
    ['constructor: boom'],
    ['toString: boom'],
    ['ValueError: math domain error'],
    ["NameError: algo distinto"],
    ["TypeError: 'int' object is not callable"],
    ['esto no es un traceback'],
  ])('devuelve null para errores que no reconoce (%s) para mostrarlos tal cual', (lastLine) => {
    expect(explainPythonError(traceback(lastLine))).toBeNull()
  })

  it('usa la última línea no vacía del traceback aunque haya líneas en blanco al final', () => {
    const stderr = `${traceback('ZeroDivisionError: division by zero')}\n\n`

    expect(explainPythonError(stderr)).toBe('Hay una división entre cero.')
  })
})
