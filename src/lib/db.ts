import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

// Required for the Neon serverless driver to work in Node.js environments
// Use Neon adapter when running on Vercel (VERCEL env var is always set)
const isVercel = !!process.env.VERCEL

if (isVercel) {
  neonConfig.webSocketConstructor = ws
}

const prismaClientSingleton = () => {
  const log = process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  
  // Hardcoded pooled Neon endpoint - used unless DATABASE_URL is explicitly set with a value
  const connectionString = (process.env.DATABASE_URL || '').trim() || 'postgresql://neondb_owner:npg_fXN3sHexb0oB@ep-proud-flower-aqxvae38-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
  console.log('[DB_DEBUG] connectionString:', connectionString?.substring(0, 50) || 'MISSING')
  
  if (isVercel) {
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool as any)
    return new PrismaClient({ adapter, log: log as any })
  }
  
  return new PrismaClient({ log: log as any })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

// Only cache the prisma client in development (not Vercel's serverless lambdas)
export const db = globalForPrisma.prisma ?? prismaClientSingleton()

if (!isVercel) globalForPrisma.prisma = db
