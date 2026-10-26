import { registerInputBlocks } from './customBlocks/inputBlocks'
import { registerMathBlocks } from './customBlocks/mathBlocks'

export function registerCustomBlocks(): void {
  registerInputBlocks()
  registerMathBlocks()
}
