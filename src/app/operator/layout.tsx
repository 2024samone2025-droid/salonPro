import React from 'react'
import { auth, signOut } from '@/lib/operator-auth'
import { Button } from '@/components/ui/button'

// Operator console chrome. Deliberately NOT a gate: requireOperator() runs in
// each page/action instead, so /operator/signin (which lives under this layout)
// stays reachable without a redirect loop. auth() here is read-only — it only
// decides whether to show the signed-in email + sign-out.
//
// The email shown is the OPERATOR's own (staff), not customer PII — showing it
// in full is correct (§7: "with the signed-in operator email").
export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const email = session?.user?.email

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/operator/signin' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">SalonPro</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">operator console</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Internal
            </span>
          </div>
          {email && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{email}</span>
              <form action={handleSignOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
