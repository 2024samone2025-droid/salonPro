import { handlers } from '@/lib/operator-auth'

// Auth.js (next-auth v5) OIDC handlers for the operator console. Reachable only
// on the operator deployment — the middleware 404s /api/operator/* unless
// OPERATOR_APP=1.
export const { GET, POST } = handlers
