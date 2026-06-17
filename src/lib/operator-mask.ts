/**
 * PII masking for operator views. The operator console can read every salon's
 * data, so PII is masked by default and only revealed by an explicit, logged
 * action. These are pure presentation helpers — they never decide access.
 *
 * The bullet (•, U+2022) signals "masked, not absent" so an operator can tell a
 * hidden value from a missing one.
 */

const BULLET = '•'

/** "Aline Niyonsaba" -> "A•••• N•••••". Keeps each word's first letter. */
export function maskName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 1) return word
      return word[0] + BULLET.repeat(word.length - 1)
    })
    .join(' ')
}

/** "aline@gmail.com" -> "a••••@gmail.com". Keeps the first local char + domain. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const at = email.indexOf('@')
  // No "@" — fall back to masking it like an opaque token.
  if (at <= 0) {
    if (email.length <= 1) return email
    return email[0] + BULLET.repeat(email.length - 1)
  }
  const local = email.slice(0, at)
  const domain = email.slice(at) // includes "@"
  const maskedLocal = local.length <= 1 ? local : local[0] + BULLET.repeat(local.length - 1)
  return maskedLocal + domain
}
