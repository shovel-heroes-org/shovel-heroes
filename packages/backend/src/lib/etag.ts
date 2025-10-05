import { createHash } from 'crypto';

// Build a weak ETag (W/"<sha1>") from any JSON-serializable value
export function makeWeakEtag(value: unknown): string {
  const json = JSON.stringify(value);
  const hex = createHash('sha1').update(json).digest('hex');
  return `W/"${hex}"`;
}

// Compute a weak ETag for a list of rows using selected keys; sorts by id when present for stability
export function computeListEtag<T extends Record<string, any>>(rows: T[], keys: Array<keyof T | string>): string {
  const proj = rows
    .map((r) => {
      const o: Record<string, any> = {};
      for (const k of keys) {
        const key = String(k);
        o[key] = r[key] ?? null;
      }
      return o;
    })
    .sort((a, b) => {
      // Prefer stable sort by id if present
      if (Object.prototype.hasOwnProperty.call(a, 'id') && Object.prototype.hasOwnProperty.call(b, 'id')) {
        return String(a.id).localeCompare(String(b.id));
      }
      return 0;
    });
  return makeWeakEtag(proj);
}

// Normalize ETag value for comparison (treat weak and strong as equivalent here)
function normalizeTag(tag: string): string {
  return tag.replace(/^W\//i, '').trim().replace(/^\"|\"$/g, '').replace(/^"|"$/g, '');
}

// Check If-None-Match header against a current ETag (supports *, weak/strong normalization)
export function ifNoneMatchSatisfied(ifNoneMatch: string | undefined, currentEtag: string): boolean {
  if (!ifNoneMatch) return false;
  const list = ifNoneMatch.split(',').map((s) => s.trim());
  if (list.includes('*')) return true;
  const current = normalizeTag(currentEtag);
  return list.some((t) => normalizeTag(t) === current);
}
