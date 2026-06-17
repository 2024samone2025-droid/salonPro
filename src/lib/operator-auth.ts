import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

/**
 * Operator authentication — a session stack entirely separate from the tenant
 * app's hand-rolled HMAC `salonpro_session`. This is Auth.js (next-auth v5) with
 * Google Workspace OIDC, mounted under /api/operator/auth, using its OWN secret
 * (OPERATOR_AUTH_SECRET — never the tenant's AUTH_SECRET) and a default JWT
 * session (no DB adapter: operators are an env allowlist, not a table — there is
 * deliberately no Operator row in v1).
 *
 * The allowlist is enforced in the signIn callback, so a non-allowlisted Google
 * account never mints a session in the first place. requireOperator() re-checks
 * it on every request as defence-in-depth.
 */

function getAllowlist(): string[] {
  return (process.env.OPERATOR_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** True only for a verified email present in OPERATOR_ALLOWED_EMAILS. */
export function isAllowedOperator(email: string | null | undefined): boolean {
  if (!email) return false
  return getAllowlist().includes(email.toLowerCase())
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Mounted off the tenant app's /api/auth/* on purpose — never collide.
  basePath: '/api/operator/auth',
  // Distinct secret: the operator session is NEVER signed with the tenant's
  // AUTH_SECRET (which protects salonpro_session).
  secret: process.env.OPERATOR_AUTH_SECRET,
  // Operator runs on its own domain behind Vercel auth; trust the deployment host.
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/operator/signin',
    error: '/operator/signin',
  },
  callbacks: {
    // The gate: only verified, allowlisted Google accounts get a session.
    signIn({ profile }) {
      const verified = profile?.email_verified === true
      return verified && isAllowedOperator(profile?.email)
    },
  },
})
