import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { pythonGenerator } from 'blockly/python'

import { registerCustomBlocks } from './customBlocks'
import { READ_TYPE_OPTIONS, wrapWithType, type ReadType } from './customBlocks/inputBlocks'

// A headless workspace: no rendering, so the blocks and their Python generators run in jsdom.
let workspace: Blockly.Workspace

beforeAll(() => {
  registerCustomBlocks()
})

beforeEach(() => {
  workspace = new Blockly.Workspace()
  pythonGenerator.init(workspace)
})

afterEach(() => {
  workspace.dispose()
})

function generatedExpression(block: Blockly.Block): string {
  const result = pythonGenerator.blockToCode(block)
  if (!Array.isArray(result)) throw new Error('expected a value block')
  return result[0]
}

describe('registerCustomBlocks', () => {
  it.each(['read_value', 'read_values_line', 'convert_to_int'])('registra el bloque %s', (type) => {
    expect(Blockly.Blocks[type]).toBeDefined()
    expect(pythonGenerator.forBlock[type]).toBeDefined()
  })
})

describe('bloque read_value', () => {
  it.each([
    ['INT', 'int(input())'],
    ['FLOAT', 'float(input())'],
    ['STR', 'input()'],
  ])('genera %s como %s', (type, expected) => {
    const block = workspace.newBlock('read_value')
    block.setFieldValue(type, 'TYPE')

    expect(generatedExpression(block)).toBe(expected)
  })

  it('es un bloque de valor sin chequeo de tipo de salida', () => {
    const block = workspace.newBlock('read_value')

    expect(block.outputConnection).not.toBeNull()
    expect(block.outputConnection?.getCheck()).toBeNull()
  })
})

describe('bloque read_values_line', () => {
  it.each([
    ['INT', 'list(map(int, input().split()))'],
    ['FLOAT', 'list(map(float, input().split()))'],
    ['STR', 'input().split()'],
  ])('genera %s como %s', (type, expected) => {
    const block = workspace.newBlock('read_values_line')
    block.setFieldValue(type, 'TYPE')

    expect(generatedExpression(block)).toBe(expected)
  })

  it('devuelve una lista (salida de tipo Array)', () => {
    const block = workspace.newBlock('read_values_line')

    expect(block.outputConnection?.getCheck()).toEqual(['Array'])
  })
})

describe('bloque convert_to_int', () => {
  it('envuelve el valor conectado con int()', () => {
    const convert = workspace.newBlock('convert_to_int')
    const number = workspace.newBlock('math_number')
    number.setFieldValue(7, 'NUM')
    convert.getInput('numverConvert')?.connection?.connect(number.outputConnection!)

    expect(generatedExpression(convert)).toBe('int(7)')
  })

  it('declara una salida de tipo Int', () => {
    const block = workspace.newBlock('convert_to_int')

    expect(block.outputConnection?.getCheck()).toEqual(['Int'])
  })
})

describe('wrapWithType', () => {
  it.each([
    ['INT', 'x', 'int(x)'],
    ['FLOAT', 'x', 'float(x)'],
    ['STR', 'x', 'x'],
  ] as Array<[ReadType, string, string]>)('con el tipo %s convierte %s en %s', (type, expr, expected) => {
    expect(wrapWithType(expr, type)).toBe(expected)
  })
})

describe('READ_TYPE_OPTIONS', () => {
  it('ofrece entero, decimal y texto en ese orden', () => {
    expect(READ_TYPE_OPTIONS).toEqual([
      ['número entero', 'INT'],
      ['decimal', 'FLOAT'],
      ['texto', 'STR'],
    ])
  })
})
