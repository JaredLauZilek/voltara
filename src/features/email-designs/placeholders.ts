import type { PlaceholderContext } from './types';

/**
 * Replace `{{path.to.value}}` tokens with the value at that path in ctx.
 * Unknown tokens are left as-is so the user can spot typos in the preview.
 */
export function substitutePlaceholders(
  template: string | null | undefined,
  ctx: PlaceholderContext,
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (raw, path: string) => {
    const segments = path.split('.');
    let cursor: unknown = ctx;
    for (const seg of segments) {
      if (cursor && typeof cursor === 'object' && seg in (cursor as Record<string, unknown>)) {
        cursor = (cursor as Record<string, unknown>)[seg];
      } else {
        return raw;
      }
    }
    return cursor == null ? raw : String(cursor);
  });
}
