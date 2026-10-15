import { atom, Atom } from "jotai";
import { unwrap } from "jotai/utils";

export type Loadable<T> =
  | { state: "loading" }
  | { state: "hasData"; data: Awaited<T> }
  | { state: "hasError"; error: unknown };

const LOADING = { state: "loading" } as const;

/**
 * Wraps an async atom so reading it never suspends. Replaces the `loadable`
 * util that Jotai 3 removed, following its migration guide.
 */
export function loadable<T>(anAtom: Atom<T>): Atom<Loadable<T>> {
  const unwrappedAtom = unwrap(anAtom, () => LOADING);

  return atom((get) => {
    try {
      const data = get(unwrappedAtom);
      if (data === LOADING) return LOADING;
      return { state: "hasData", data: data as Awaited<T> };
    } catch (error) {
      return { state: "hasError", error };
    }
  });
}
