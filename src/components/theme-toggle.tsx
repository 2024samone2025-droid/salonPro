'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type DisplayTheme = 'light' | 'dark'

function currentDisplayTheme(): DisplayTheme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const { setTheme } = useAuth()
  // null until mounted so SSR markup never disagrees with the client
  const [theme, setLocalTheme] = useState<DisplayTheme | null>(null)

  useEffect(() => {
    setLocalTheme(currentDisplayTheme())
  }, [])

  const toggle = async () => {
    const next: DisplayTheme = currentDisplayTheme() === 'dark' ? 'light' : 'dark'
    setLocalTheme(next)
    // Context owns the change: applies to the DOM, updates state, and persists.
    const saved = await setTheme(next)
    if (!saved) toast.error("Couldn't save your theme preference")
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="plain"
            size="icon"
            onClick={toggle}
            className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            aria-label={label}
          >
            {theme === 'dark' ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
