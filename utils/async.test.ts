import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapWithConcurrency, withRetry } from "@/utils/async";

describe("mapWithConcurrency", () => {
  it("keeps results in input order", async () => {
    const results = await mapWithConcurrency([30, 10, 20], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });

    expect(results).toEqual([60, 20, 40]);
  });

  it("never runs more than the limit at once", async () => {
    let active = 0;
    let peak = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
    });

    expect(peak).toBe(3);
  });

  it("returns an empty array for empty input", async () => {
    const fn = vi.fn();

    expect(await mapWithConcurrency([], 4, fn)).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it("rejects when one call fails", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("download failed");
        return n;
      })
    ).rejects.toThrow("download failed");
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the first successful result without waiting", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after 1s, then 2s, and returns the result", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429"))
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValue("ok");

    const result = withRetry(fn);

    await vi.advanceTimersByTimeAsync(999);
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);
    await expect(result).resolves.toBe("ok");
  });

  it("throws the last error after the last retry", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("429"));

    const result = withRetry(fn, 3, 1000);
    const assertion = expect(result).rejects.toThrow("429");

    // Waits 1s + 2s + 4s between the four attempts
    await vi.advanceTimersByTimeAsync(7000);

    await assertion;
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
