import * as Blockly from 'blockly/core'
import { pythonGenerator, Order } from 'blockly/python'

export function registerCustomBlocks(): void {
  Blockly.Blocks['convert_to_int'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('numverConvert')
        .setCheck('Number')
        .appendField('Convertir a entero')
      this.setInputsInline(false)
      this.setOutput(true, 'Int')
      this.setColour(230)
      this.setTooltip('Convertir a número entero')
      this.setHelpUrl('')
    },
  }

  pythonGenerator.forBlock['convert_to_int'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const value = generator.valueToCode(block, 'numverConvert', Order.ATOMIC)
    return [`int(${value})`, Order.NONE]
  }
}
