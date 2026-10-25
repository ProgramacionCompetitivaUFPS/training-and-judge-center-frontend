import * as Blockly from 'blockly/core'
import { pythonGenerator, Order } from 'blockly/python'

export function registerMathBlocks(): void {
  Blockly.Blocks['convert_to_int'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('numverConvert')
        .setCheck('Number')
        .appendField('Convertir a entero')
      this.setInputsInline(false)
      this.setOutput(true, 'Int')
      this.setColour(230)
      this.setTooltip('Convierte un valor a número entero')
      this.setHelpUrl('')
    },
  }
  pythonGenerator.forBlock['convert_to_int'] = (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) => {
    const value = generator.valueToCode(block, 'numverConvert', Order.ATOMIC)
    return [`int(${value})`, Order.FUNCTION_CALL]
  }
}
