import { describe, it, expect } from 'vitest'

import { ApiClientError } from './errors'
import { getErrorMessage, ERROR_MESSAGES } from './errorMessages'

describe('ERROR_MESSAGES', () => {
  it('contiene mensaje en español para INVALID_CREDENTIALS', () => {
    expect(ERROR_MESSAGES['INVALID_CREDENTIALS']).toBe('Correo o contraseña incorrectos')
  })

  it('contiene mensaje en español para NOT_FOUND', () => {
    expect(ERROR_MESSAGES['NOT_FOUND']).toBe('Recurso no encontrado')
  })

  it('contiene mensaje en español para INTERNAL_ERROR', () => {
    expect(ERROR_MESSAGES['INTERNAL_ERROR']).toBe('Ocurrió un error inesperado')
  })

  it('contiene mensaje en español para ALREADY_MEMBER (grupos)', () => {
    expect(ERROR_MESSAGES['ALREADY_MEMBER']).toBe('Ya eres miembro de este grupo')
  })

  it('contiene mensaje en español para TEAM_NOT_FOUND (equipos)', () => {
    expect(ERROR_MESSAGES['TEAM_NOT_FOUND']).toBe('Equipo no encontrado')
  })

  it('contiene mensaje en español para DUPLICATE_SUBMISSION (envíos)', () => {
    expect(ERROR_MESSAGES['DUPLICATE_SUBMISSION']).toBe('Ya enviaste este mismo archivo a este problema')
  })

  it('contiene mensaje en español para MATERIAL_NOT_FOUND (materiales)', () => {
    expect(ERROR_MESSAGES['MATERIAL_NOT_FOUND']).toBe('Material no encontrado')
  })

  it.each([
    ['CONTEST_PROBLEMS_LOCKED', 'No se pueden cambiar los problemas de una competencia finalizada'],
    ['INVALID_PROBLEM_COLOR', 'El color del problema no es válido'],
  ])('tiene el mensaje en español para %s', (code, message) => {
    expect(ERROR_MESSAGES[code]).toBe(message)
  })
})

describe('getErrorMessage', () => {
  it('devuelve el mensaje mapeado en español para código conocido', () => {
    const error = new ApiClientError(401, 'INVALID_CREDENTIALS', 'invalid credentials')
    expect(getErrorMessage(error)).toBe('Correo o contraseña incorrectos')
  })

  it('cae al error.message para código de ApiClientError desconocido', () => {
    const error = new ApiClientError(400, 'SOME_UNKNOWN_CODE', 'mensaje crudo del backend')
    expect(getErrorMessage(error)).toBe('mensaje crudo del backend')
  })

  it('devuelve el fallback por defecto para un error no-ApiClientError', () => {
    expect(getErrorMessage(new Error('boom'))).toBe(
      'Ocurrió un error inesperado. Inténtalo de nuevo.',
    )
  })

  it('acepta un fallback personalizado', () => {
    expect(getErrorMessage(new Error('boom'), 'Error personalizado')).toBe('Error personalizado')
  })

  it('devuelve el fallback por defecto para null', () => {
    expect(getErrorMessage(null)).toBe('Ocurrió un error inesperado. Inténtalo de nuevo.')
  })

  it('devuelve el fallback por defecto para undefined', () => {
    expect(getErrorMessage(undefined)).toBe('Ocurrió un error inesperado. Inténtalo de nuevo.')
  })
})

describe('ERROR_MESSAGES de importación de problemas', () => {
  it.each([
    ['ZIP_TOO_LARGE', 'El ZIP supera el tamaño máximo permitido (150 MB)'],
    ['EXTRACTED_SIZE_TOO_LARGE', 'El contenido descomprimido del ZIP supera el límite (150 MB)'],
    ['MISSING_PROBLEM_YAML', 'El ZIP no contiene problem.yaml'],
    ['INVALID_PROBLEM_YAML', 'El problem.yaml tiene un error de sintaxis o le falta el campo name'],
  ])('ERROR_MESSAGES["%s"] está definido y en español', (code, expected) => {
    expect(ERROR_MESSAGES[code]).toBe(expected)
  })
})
