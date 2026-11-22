import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ValidationReportView } from './ValidationReportView'

describe('ValidationReportView', () => {
  it('no muestra ninguna sección cuando no hay hallazgos', () => {
    render(<ValidationReportView />)

    expect(screen.queryByText(/Error de compilación/)).not.toBeInTheDocument()
    expect(screen.queryByText('Casos de prueba fallidos:')).not.toBeInTheDocument()
    expect(screen.queryByText('Entradas rechazadas por el validador:')).not.toBeInTheDocument()
    expect(screen.queryByText('Ver logs completos')).not.toBeInTheDocument()
  })

  it('no muestra las secciones de listas cuando llegan vacías', () => {
    render(<ValidationReportView failedTestCases={[]} failedInputs={[]} validationLogs={[]} />)

    expect(screen.queryByText('Casos de prueba fallidos:')).not.toBeInTheDocument()
    expect(screen.queryByText('Entradas rechazadas por el validador:')).not.toBeInTheDocument()
    expect(screen.queryByText('Ver logs completos')).not.toBeInTheDocument()
  })

  it('muestra el archivo que no compiló y sus errores línea por línea', () => {
    render(
      <ValidationReportView
        compilationErrors={{ file: 'sol.cpp', errors: ['sol.cpp:3: error: expected ;', 'sol.cpp:9: error: undeclared x'] }}
      />,
    )

    expect(screen.getByText('sol.cpp')).toBeInTheDocument()
    expect(screen.getByText(/sol\.cpp:3: error: expected ;/)).toBeInTheDocument()
    expect(screen.getByText(/sol\.cpp:9: error: undeclared x/)).toBeInTheDocument()
  })

  describe('casos de prueba fallidos', () => {
    it.each([
      ['WRONG_ANSWER', 'Respuesta Incorrecta'],
      ['TIME_LIMIT_EXCEEDED', 'Tiempo Límite Excedido'],
      ['RUNTIME_ERROR', 'Error en Tiempo de Ejecución'],
    ])('traduce el veredicto %s a «%s»', (status, label) => {
      render(<ValidationReportView failedTestCases={[{ case: '01', status }]} />)

      expect(screen.getByText('01')).toBeInTheDocument()
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument()
    })

    it('usa verdict cuando el caso no trae status', () => {
      render(<ValidationReportView failedTestCases={[{ case: '02', verdict: 'MEMORY_LIMIT_EXCEEDED' }]} />)

      expect(screen.getByText(/Memoria Límite Excedida/)).toBeInTheDocument()
    })

    it('muestra un veredicto desconocido tal como llega', () => {
      render(<ValidationReportView failedTestCases={[{ case: '03', status: 'CHECKER_CRASHED' }]} />)

      expect(screen.getByText(/CHECKER_CRASHED/)).toBeInTheDocument()
    })

    it('muestra los detalles del caso', () => {
      render(<ValidationReportView failedTestCases={[{ case: '04', status: 'WRONG_ANSWER', details: 'línea 2 distinta' }]} />)

      expect(screen.getByText('línea 2 distinta')).toBeInTheDocument()
    })

    it('ofrece la respuesta esperada y la obtenida cuando existen', () => {
      render(
        <ValidationReportView
          failedTestCases={[{ case: '05', status: 'WRONG_ANSWER', expected: '42\n', actual: '41\n' }]}
        />,
      )

      expect(screen.getByText('Ver respuesta esperada y obtenida')).toBeInTheDocument()
      expect(screen.getByText('Esperada')).toBeInTheDocument()
      expect(screen.getByText('Obtenida')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('41')).toBeInTheDocument()
    })

    it('no ofrece el desplegable de respuestas cuando el caso no trae esperada ni obtenida', () => {
      render(<ValidationReportView failedTestCases={[{ case: '06', status: 'TIME_LIMIT_EXCEEDED' }]} />)

      expect(screen.queryByText('Ver respuesta esperada y obtenida')).not.toBeInTheDocument()
    })
  })

  it('lista las entradas que el validador rechazó con su motivo', () => {
    render(
      <ValidationReportView
        failedInputs={[
          { file: 'secret/1.in', reason: 'n fuera de rango' },
          { file: 'secret/2.in', reason: 'línea extra' },
        ]}
      />,
    )

    expect(screen.getByText('Entradas rechazadas por el validador:')).toBeInTheDocument()
    expect(screen.getByText('secret/1.in')).toBeInTheDocument()
    expect(screen.getByText(/n fuera de rango/)).toBeInTheDocument()
    expect(screen.getByText(/línea extra/)).toBeInTheDocument()
  })

  it('ofrece los logs completos de la validación', () => {
    render(<ValidationReportView validationLogs={['Compilando checker', 'Ejecutando caso 1']} />)

    expect(screen.getByText('Ver logs completos')).toBeInTheDocument()
    expect(screen.getByText('Compilando checker')).toBeInTheDocument()
    expect(screen.getByText('Ejecutando caso 1')).toBeInTheDocument()
  })
})
