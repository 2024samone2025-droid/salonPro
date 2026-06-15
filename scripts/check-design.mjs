#!/usr/bin/env node
/**
 * Design-system lint — the guardrail that keeps the UI on the single source of
 * truth (how big design systems stay consistent: machines enforce it, not people).
 *
 * Fails (exit 1) when our code drifts off the system:
 *   1. Arbitrary font sizes — `text-[13px]`, `text-[0.8rem]`, `text-[#fff]`, …
 *      Use a named role (text-body/caption/…) or a Tailwind step. See DESIGN_SYSTEM.md.
 *   2. Raw colors — `#rrggbb`, `rgb()/rgba()`, `hsl(<number>…)`.
 *      Use the semantic tokens in globals.css (bg-card, text-muted-foreground, …).
 *
 * Vendored primitives (`src/components/ui/`) and the pre-theme no-JS fallback
 * (`layout.tsx`) are exempt — we own design tokens in our own components/screens.
 *
 * Usage: npm run lint:design
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src/components', 'src/app']
const EXEMPT = ['src/components/ui/', 'src/app/layout.tsx']

const RULES = [
  {
    id: 'arbitrary-font-size',
    re: /\btext-\[[^\]]+\]/g,
    hint: 'arbitrary font size — use a named role (text-body/caption/subtitle/title) or a Tailwind step',
  },
  {
    id: 'raw-color',
    re: /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsl\(\s*\d/g,
    hint: 'raw color — use a semantic token (bg-card, text-muted-foreground, border-border, …)',
  },
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(tsx|ts)$/.test(p)) yield p
  }
}

const isExempt = (rel) => EXEMPT.some((e) => rel.startsWith(e) || rel === e)

const violations = []
for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir)
  try {
    statSync(abs)
  } catch {
    continue
  }
  for (const file of walk(abs)) {
    const rel = relative(ROOT, file)
    if (isExempt(rel)) continue
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        rule.re.lastIndex = 0
        const m = rule.re.exec(line)
        if (m) violations.push({ rel, line: i + 1, rule: rule.id, hint: rule.hint, snippet: m[0] })
      }
    })
  }
}

if (violations.length === 0) {
  console.log('✓ design lint: no drift — every color & font size comes from the design system.')
  process.exit(0)
}

const byRule = {}
for (const v of violations) (byRule[v.rule] ??= []).push(v)

console.error(`\n✗ design lint: ${violations.length} violation(s) off the design system:\n`)
for (const [rule, list] of Object.entries(byRule)) {
  console.error(`  ${rule} (${list.length}) — ${list[0].hint}`)
  for (const v of list.slice(0, 100)) {
    console.error(`    ${v.rel}:${v.line}  ${v.snippet}`)
  }
  console.error('')
}
process.exit(1)
