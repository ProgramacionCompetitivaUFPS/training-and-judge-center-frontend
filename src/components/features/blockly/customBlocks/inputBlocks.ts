import * as Blockly from 'blockly/core'
import { pythonGenerator, Order } from 'blockly/python'

export function registerInputBlocks(): void {
  Blockly.Blocks['read_value'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('leer')
        .appendField(
          new Blockly.FieldDropdown([
            ['número entero', 'INT'],
            ['decimal', 'FLOAT'],
            ['texto', 'STR'],
          ]),
          'TYPE',
        )
      this.setOutput(true, null)
      this.setColour(160)
      this.setTooltip('Lee un valor de la entrada estándar según el tipo seleccionado.')
      this.setHelpUrl('')
    },
  }
  pythonGenerator.forBlock['read_value'] = (block: Blockly.Block) => {
    const type = block.getFieldValue('TYPE') as 'INT' | 'FLOAT' | 'STR'
    const wrappers: Record<typeof type, string> = {
      INT: 'int(input())',
      FLOAT: 'float(input())',
      STR: 'input()',
    }
    return [wrappers[type], Order.FUNCTION_CALL]
  }

  Blockly.Blocks['read_values_line'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('leer línea de')
        .appendField(
          new Blockly.FieldDropdown([
            ['números enteros', 'INT'],
            ['decimales', 'FLOAT'],
            ['textos', 'STR'],
          ]),
          'TYPE',
        )
      this.setOutput(true, 'Array')
      this.setColour(160)
      this.setTooltip('Lee una línea con varios valores separados por espacios y los devuelve como lista.')
      this.setHelpUrl('')
    },
  }
  pythonGenerator.forBlock['read_values_line'] = (block: Blockly.Block) => {
    const type = block.getFieldValue('TYPE') as 'INT' | 'FLOAT' | 'STR'
    const expressions: Record<typeof type, string> = {
      INT: `list(map(int, input().split()))`,
      FLOAT: `list(map(float, input().split()))`,
      STR: `input().split()`,
    }
    return [expressions[type], Order.FUNCTION_CALL]
  }
}
