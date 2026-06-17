import { PrismaClient } from '@prisma/client'

// ============================================================================
//  Seed subscription data. Run AFTER migrating the new models.
//  Idempotent (upserts) — safe to run more than once.
//  If you already have a prisma/seed.ts, merge main() into it instead.
// ============================================================================

const db = new PrismaClient()

async function main() {
  // --- Plans (reference data) ----------------------------------------------
  // Seeded to match the app's current reality: free + pro @ 15,000 RWF.
  // Add "basic" / "enterprise" later by inserting rows — no migration needed.
  // null limit = unlimited.
  await db.plan.upsert({
    where: { id: 'free' },
    update: {},
    create: {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'RWF',
      interval: 'monthly',
      maxCustomers: 100, // was FREE_PLAN_LIMITS.maxCustomers
      maxStaff: 5, // was FREE_PLAN_LIMITS.maxStaff
      maxLocations: 1,
      maxSms: 0,
      features: { online_booking: true },
      isActive: true,
      sortOrder: 1,
    },
  })

  await db.plan.upsert({
    where: { id: 'pro' },
    update: {},
    create: {
      id: 'pro',
      name: 'Pro',
      price: 15000, // RWF / month (was hardcoded in the billing UI)
      currency: 'RWF',
      interval: 'monthly',
      maxCustomers: null, // unlimited
      maxStaff: null, // unlimited
      maxLocations: 3,
      maxSms: 1000,
      features: {
        online_booking: true,
        advanced_reports: true,
        inventory: true,
        marketing: true,
      },
      isActive: true,
      sortOrder: 2,
    },
  })

  // --- Backfill: one Subscription per existing salon, from its current plan --
  const salons = await db.salon.findMany({ select: { id: true, plan: true } })
  for (const s of salons) {
    const planId = s.plan === 'pro' ? 'pro' : 'free'
    await db.subscription.upsert({
      where: { salonId: s.id },
      update: {}, // don't clobber existing subscriptions
      create: {
        salonId: s.id,
        planId,
        status: 'ACTIVE', // free is active-forever (periodEnd stays null)
        periodEnd: null,
      },
    })
  }

  console.log(`Seeded plans. Backfilled ${salons.length} salon subscription(s).`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
