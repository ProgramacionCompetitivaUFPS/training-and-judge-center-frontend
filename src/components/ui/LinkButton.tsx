import { Link, type LinkProps } from 'react-router-dom'
import { buttonClasses, type ButtonVariant, type ButtonSize } from './buttonStyles'

interface LinkButtonProps extends Omit<LinkProps, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/**
 * A real link (<a href>) dressed as a button. Use it instead of a <Link> wrapping a <Button>:
 * a button inside a link is invalid HTML, and the browser treats a click on it as the button's,
 * so a middle click or Ctrl+click wouldn't open a new tab.
 */
export function LinkButton({ variant = 'outline', size = 'md', className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />
}
