/**
 * Move an element between positions, returning a new array.
 *
 * Out-of-range targets return the original array untouched, so callers can wire
 * a handle's first/last row to a no-op instead of guarding at every call site.
 */
export function moveInArray<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from < 0 || from >= items.length || from === to) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
