import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

// Owner passwords use scrypt (built into Node — no new dependency). This is a
// real password hash with a per-password random salt, unlike the SHA-256 used
// for staff PINs (which are low-entropy, per-salon, shared-tablet credentials).
const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

/** Hash a plaintext password → "saltHex:hashHex". */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

/** Constant-time verify of a plaintext password against a stored "saltHex:hashHex". */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const keyBuf = Buffer.from(key, 'hex')
  const derived = (await scryptAsync(plain, salt, keyBuf.length)) as Buffer
  if (derived.length !== keyBuf.length) return false
  return timingSafeEqual(derived, keyBuf)
}
