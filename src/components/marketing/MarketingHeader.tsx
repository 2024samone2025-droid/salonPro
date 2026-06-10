'use client'

import Link from 'next/link'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Triangle, LayoutDashboard, LogOut } from 'lucide-react'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function HeaderActions() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    // Reserve the space so the header doesn't shift when auth resolves
    return <div className="h-9 w-44" aria-hidden="true" />
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost">Log in</Button>
        </Link>
        <Link href="/signup">
          <Button>Start free trial</Button>
        </Link>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-9 rounded-full p-0" aria-label="Account menu">
          <Avatar className="size-8 border">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="size-4 mr-2" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="size-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function MarketingHeader() {
  return (
    <AuthProvider>
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-md bg-primary">
              <Triangle className="size-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-xl font-semibold">SalonPro</span>
          </div>
          <HeaderActions />
        </div>
      </header>
    </AuthProvider>
  )
}
