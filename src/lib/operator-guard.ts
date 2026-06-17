import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth, isAllowedOperator } from './operator-auth'

export interface OperatorSession {
  operatorEmail: string
}

/**
 * The default-deny gate every operator surface (pages + server actions) must
 * pass through before touching cross-tenant data. Three independent checks, all
 * required:
 *
 *  1. Host — the operator app only answers on its own domain (OPERATOR_HOST).
 *     Relaxed outside production, where a single localhost dev server serves
 *     both the tenant and operator apps (mirrors the middleware's ?salon= dev
 *     fallback). A wrong host in production 404s — never admit the app exists.
 *  2. Session — a valid Auth.js OIDC session must be present.
 *  3. Allowlist — the email must still be in OPERATOR_ALLOWED_EMAILS. The signIn
 *     callback already enforced this at login; re-checking here means revoking
 *     access is just an env change, with no stale session slipping through.
 *
 * Returns the operator's email (the audit-log actor) or never returns.
 */
export async function requireOperator(): Promise<OperatorSession> {
  // 1. Host.
  if (process.env.NODE_ENV === 'production') {
    const host = (await headers()).get('host')?.split(':')[0].toLowerCase()
    const expected = process.env.OPERATOR_HOST?.split(':')[0].toLowerCase()
    if (!expected || host !== expected) notFound()
  }

  // 2. Session + 3. allowlist.
  const session = await auth()
  const email = session?.user?.email
  if (!email || !isAllowedOperator(email)) redirect('/operator/signin')

  return { operatorEmail: email }
}
