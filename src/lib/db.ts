import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

// Required for the Neon serverless driver to work in Node.js environments
if (process.env.NODE_ENV === 'production') {
  neonConfig.webSocketConstructor = ws
}

const prismaClientSingleton = () => {
  const log = process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  
  // Hardcoded pooled Neon endpoint - used unless DATABASE_URL is explicitly set with a value
  const connectionString = (process.env.DATABASE_URL || '').trim() || 'postgresql://neondb_owner:npg_fXN3sHexb0oB@ep-proud-flower-aqxvae38-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
  
  if (process.env.NODE_ENV === 'production') {
    neonConfig.webSocketConstructor = ws
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool as any)
    return new PrismaClient({ adapter, log: log as any })
  }
  
  return new PrismaClient({ log: log as any })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

export const db = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
