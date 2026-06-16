import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/operator-auth'
import { Button } from '@/components/ui/button'

// The only ungated operator route — the entry point to the SSO flow. Already
// signed in -> straight to the directory. The Google account still has to clear
// the allowlist in the signIn callback before any session is minted.
export default async function OperatorSignInPage() {
  const session = await auth()
  if (session?.user?.email) redirect('/operator')

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
        <form action={handleSignIn} className="mt-6">
          <Button type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>
      </div>
    </div>
  )
}
