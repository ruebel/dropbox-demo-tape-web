/**
 * Maps over items with an async function, running at most `limit` calls
 * at a time. Results keep the order of `items`.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );

  return results;
}

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  // Stops retrying once aborted
  signal?: AbortSignal;
};

/**
 * Calls `fn` and retries it when it throws. Waits `delayMs` before the first
 * retry and doubles the wait for each retry after that.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, delayMs = 1000, signal }: RetryOptions = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0 || signal?.aborted) throw error;

    await wait(delayMs, signal);
    return withRetry(fn, { retries: retries - 1, delayMs: delayMs * 2, signal });
  }
}

// Resolves after `ms`, or rejects as soon as the signal aborts
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });
}
