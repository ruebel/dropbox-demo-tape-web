import { atom, createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { loadable } from "@/utils/loadable";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("loadable", () => {
  it("is loading until the promise resolves, then has the data", async () => {
    const { promise, resolve } = deferred<string[]>();
    const asyncAtom = atom(() => promise);
    const loadableAtom = loadable(asyncAtom);
    const store = createStore();
    store.sub(loadableAtom, () => {});

    expect(store.get(loadableAtom)).toEqual({ state: "loading" });

    resolve(["a", "b"]);
    await promise;

    expect(store.get(loadableAtom)).toEqual({
      state: "hasData",
      data: ["a", "b"],
    });
  });

  it("has the error when the promise rejects", async () => {
    const { promise, reject } = deferred<string[]>();
    const asyncAtom = atom(() => promise);
    const loadableAtom = loadable(asyncAtom);
    const store = createStore();
    store.sub(loadableAtom, () => {});

    const error = new Error("Failed to fetch");
    reject(error);
    await promise.catch(() => {});

    expect(store.get(loadableAtom)).toEqual({ state: "hasError", error });
  });

  it("goes back to loading when the source atom recomputes", async () => {
    const counterAtom = atom(0);
    const pending = deferred<number>();
    const asyncAtom = atom((get) => {
      const count = get(counterAtom);
      return count === 0 ? Promise.resolve(count) : pending.promise;
    });
    const loadableAtom = loadable(asyncAtom);
    const store = createStore();
    store.sub(loadableAtom, () => {});
    await Promise.resolve();

    expect(store.get(loadableAtom)).toEqual({ state: "hasData", data: 0 });

    store.set(counterAtom, 1);

    expect(store.get(loadableAtom)).toEqual({ state: "loading" });
  });
});
