import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

const DEFAULT_TAKE = 50
const MAX_TAKE = 100

// Reverse-chronological activity feed for the resolved salon. Admin/owner only
// (canViewActivityLog). Cursor-paginated on createdAt via the row id: pass the
// last id back as ?cursor= to fetch the next page.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'canViewActivityLog')
  if (!auth.authorized) return auth.error

  const params = req.nextUrl.searchParams
  const takeParam = Number(params.get('take'))
  const take = Number.isFinite(takeParam) && takeParam > 0 ? Math.min(takeParam, MAX_TAKE) : DEFAULT_TAKE
  const cursor = params.get('cursor')

  const rows = await db.activityLog.findMany({
    where: { salonId: auth.salonId },
    orderBy: { createdAt: 'desc' },
    take: take + 1, // fetch one extra to know if there's a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > take
  const items = hasMore ? rows.slice(0, take) : rows
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({ items, nextCursor })
}
