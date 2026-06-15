'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Theme = 'light' | 'dark'

function getTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export default function ThemeToggle() {
  // null until mounted so SSR markup never disagrees with the client
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(getTheme())
  }, [])

  const toggle = () => {
    const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try {
      localStorage.setItem('theme', next)
    } catch {}
    setTheme(next)
    // Persist to the server so the choice follows the user across devices.
    // Fire-and-forget: on unauthenticated surfaces this 401s harmlessly.
    fetch('/api/me/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { appPreferences: { theme: next } } }),
    }).catch(() => {})
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
