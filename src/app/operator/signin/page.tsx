import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/operator-auth'
import { Button } from '@/components/ui/button'

// Auth.js redirects failed sign-ins back here with ?error=<code> (the error page
// is pointed at this route). Map the codes operators can actually hit to plain
// feedback — the important one is AccessDenied, returned when the signIn callback
// rejects a Google account that isn't on the allowlist (or whose email is
// unverified). Without this the rejection is a silent bounce back to the button.
function errorNotice(code: string | undefined): { title: string; body: string } | null {
  if (!code) return null
  switch (code) {
    case 'AccessDenied':
      return {
        title: 'Access denied',
        body: "This Google account isn't authorized for the operator console. Sign in with an approved account, or contact an administrator if you believe this is a mistake.",
      }
    case 'Configuration':
      return {
        title: 'Sign-in unavailable',
        body: 'Operator sign-in is temporarily misconfigured. Please try again later or contact an administrator.',
      }
    default:
      return {
        title: 'Sign-in failed',
        body: 'Something went wrong during sign-in. Please try again.',
      }
  }
}

// The only ungated operator route — the entry point to the SSO flow. Already
// signed in -> straight to the directory. The Google account still has to clear
// the allowlist in the signIn callback before any session is minted.
export default async function OperatorSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const session = await auth()
  if (session?.user?.email) redirect('/operator')

  const { error } = await searchParams
  const notice = errorNotice(Array.isArray(error) ? error[0] : error)

  async function handleSignIn() {
    'use server'
    await signIn('google', { redirectTo: '/operator' })
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">Operator console</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Internal access only. Sign in with your SalonPro staff Google account.
        </p>

        {notice && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-left"
          >
            <p className="text-sm font-medium text-destructive">{notice.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{notice.body}</p>
          </div>
        )}

        <form action={handleSignIn} className="mt-6">
          <Button type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>
      </div>
    </div>
  )
}
