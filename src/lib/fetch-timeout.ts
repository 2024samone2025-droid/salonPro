// A fetch that gives up after `timeoutMs` so a stalled network never leaves the
// UI on a spinner forever. Distinguishes its own timeout (-> TimeoutError, show
// a "taking too long, retry" message) from a caller-driven abort like an unmount
// (-> the original AbortError, which callers ignore).

export class TimeoutError extends Error {
  constructor(message = 'The request took too long.') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  // Honour a caller-supplied signal (e.g. unmount cleanup) alongside our timer.
  const callerSignal = init.signal
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort()
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (err) {
    // Our timer fired, not the caller -> surface a friendly timeout.
    if (controller.signal.aborted && !callerSignal?.aborted) {
      throw new TimeoutError()
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
