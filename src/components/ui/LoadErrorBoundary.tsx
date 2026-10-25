import { Component, type ReactNode } from 'react'

interface LoadErrorBoundaryProps {
  /** Rendered instead of the children when they fail to load or render. */
  fallback: ReactNode
  children: ReactNode
}

interface LoadErrorBoundaryState {
  failed: boolean
}

/**
 * Contains a failure of a lazily loaded part of a page. `Suspense` only covers the loading
 * state: when the chunk itself fails to download (typically a stale chunk right after a
 * deployment) React.lazy throws, and without a boundary the whole app unmounts to a blank page.
 */
export class LoadErrorBoundary extends Component<LoadErrorBoundaryProps, LoadErrorBoundaryState> {
  state: LoadErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): LoadErrorBoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
