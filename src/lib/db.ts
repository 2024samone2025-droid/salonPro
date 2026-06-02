import { PrismaClient } from '@prisma/client'

// Fix: system env may have stale DATABASE_URL from old SQLite setup.
// Next.js .env files don't override system env vars, so we force it here.
const NEON_URL = 'postgresql://neondb_owner:npg_fXN3sHexb0oB@ep-proud-flower-aqxvae38-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
const NEON_DIRECT_URL = 'postgresql://neondb_owner:npg_fXN3sHexb0oB@ep-proud-flower-aqxvae38.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://')) {
  process.env.DATABASE_URL = NEON_URL
}
if (!process.env.DIRECT_URL || !process.env.DIRECT_URL.startsWith('postgresql://')) {
  process.env.DIRECT_URL = NEON_DIRECT_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
