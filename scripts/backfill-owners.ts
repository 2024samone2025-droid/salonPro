/**
 * Phase 4 — owner backfill.
 *
 * Gives each existing salon an Owner + OwnerSalon link, so owner-login works for
 * salons created before the owner model existed. Only ADDS Owner/OwnerSalon rows
 * — it never reads or writes User (staff PINs are untouched).
 *
 *   Dry run (default, NO writes — lists what it would do):
 *     npx tsx scripts/backfill-owners.ts        (or: bun run scripts/backfill-owners.ts)
 *
 *   Commit (writes; prints temp passwords for newly-created owners):
 *     npx tsx scripts/backfill-owners.ts --commit
 *
 * Idempotent: owners are looked up by email (check-or-create) and links are
 * guarded by @@unique([ownerId, salonId]), so re-running creates no duplicates
 * and never overwrites an existing owner's password.
 *
 * NOTE: new owners get a random temp password (printed below) + mustResetPassword
 * = true. Reset ENFORCEMENT is not built yet, so login currently works with the
 * printed temp password. Capture the passwords from the first --commit run.
 */
import { config } from 'dotenv'
config({ path: '.env', override: true })

import { PrismaClient } from '@prisma/client'
import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util'

const db = new PrismaClient({ log: ['warn', 'error'] })
const scryptAsync = promisify(scrypt)

// ─────────────────────────────────────────────────────────────────────────────
// FILL THIS IN: map each salon's subdomain to the owner email it should get.
// A salon NOT listed here is skipped (never given a placeholder email).
// 'demo' is pre-filled so owner-login to the demo salon works for testing.
// ─────────────────────────────────────────────────────────────────────────────
const SUBDOMAIN_TO_EMAIL: Record<string, string> = {
  demo: 'owner@demo.salonpro.me',
  // hello: 'you@example.com',
  // mysalon: 'you@example.com',
  // mysalon1: 'you@example.com',
  // vision3030: 'you@example.com',
  // vision: 'you@example.com',
}
// ─────────────────────────────────────────────────────────────────────────────

const COMMIT = process.argv.includes('--commit')

// Mirror of lib/password.ts hashPassword (kept inline so the script has no app
// import coupling): scrypt with a per-password salt → "saltHex:hashHex".
async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

function tempPassword(): string {
  // ~16 url-safe chars, well over the 8-char minimum.
  return randomBytes(12).toString('base64url')
}

async function main() {
  console.log(`\n=== Owner backfill — ${COMMIT ? 'COMMIT (writing)' : 'DRY RUN (no writes)'} ===\n`)

  const salons = await db.salon.findMany({
    select: { id: true, name: true, subdomain: true },
    orderBy: { createdAt: 'asc' },
  })

  const created: { subdomain: string; email: string; password: string }[] = []
  let linked = 0
  let skipped = 0
  let unchanged = 0

  for (const salon of salons) {
    const email = SUBDOMAIN_TO_EMAIL[salon.subdomain]?.trim().toLowerCase()

    if (!email) {
      console.log(`SKIP   ${salon.subdomain.padEnd(16)} — no email in SUBDOMAIN_TO_EMAIL map`)
      skipped++
      continue
    }

    // Check-or-create the owner (by unique email — supports one owner across salons).
    let owner = await db.owner.findUnique({ where: { email } })
    if (!owner) {
      if (COMMIT) {
        const password = tempPassword()
        owner = await db.owner.create({
          data: {
            email,
            name: email.split('@')[0],
            passwordHash: await hashPassword(password),
            mustResetPassword: true,
          },
        })
        created.push({ subdomain: salon.subdomain, email, password })
        console.log(`CREATE ${salon.subdomain.padEnd(16)} — owner ${email} (temp password below)`)
      } else {
        console.log(`CREATE ${salon.subdomain.padEnd(16)} — would create owner ${email}`)
      }
    } else {
      console.log(`OWNER  ${salon.subdomain.padEnd(16)} — owner ${email} already exists (reuse)`)
    }

    // Ensure the OwnerSalon link (idempotent via the compound unique).
    if (owner) {
      const existingLink = await db.ownerSalon.findUnique({
        where: { ownerId_salonId: { ownerId: owner.id, salonId: salon.id } },
      })
      if (existingLink) {
        console.log(`       ${' '.repeat(16)}   link already present — nothing to do`)
        unchanged++
      } else if (COMMIT) {
        await db.ownerSalon.create({ data: { ownerId: owner.id, salonId: salon.id } })
        console.log(`LINK   ${salon.subdomain.padEnd(16)} — linked owner → salon`)
        linked++
      } else {
        console.log(`LINK   ${salon.subdomain.padEnd(16)} — would link owner → salon`)
        linked++
      }
    } else {
      // Dry run with no existing owner — count the link it would make.
      linked++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`salons:        ${salons.length}`)
  console.log(`skipped (unmapped): ${skipped}`)
  console.log(`links ${COMMIT ? 'created' : 'to create'}: ${linked}`)
  console.log(`links already present: ${unchanged}`)

  if (created.length) {
    console.log(`\n!!! TEMP PASSWORDS (shown once — save these now) !!!`)
    for (const c of created) {
      console.log(`  ${c.subdomain.padEnd(16)} ${c.email.padEnd(28)} ${c.password}`)
    }
    console.log(`(mustResetPassword=true on each; login works with these until reset enforcement ships)`)
  }

  if (!COMMIT) {
    console.log(`\nDry run only — no changes written. Re-run with --commit to apply.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
