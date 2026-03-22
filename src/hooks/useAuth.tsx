/**
 * Re-export from the canonical location.
 * AuthProvider lives in components/layout/ because it's a React context provider
 * mounted in the component tree, not a pure hook.
 */
export { AuthProvider, useAuth } from '@/components/layout/AuthProvider'
