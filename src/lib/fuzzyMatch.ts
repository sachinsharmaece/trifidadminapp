// Shared near-duplicate name check for the master-data "add company"/"add
// product" forms. Kept client-side deliberately (see catalog.service.ts's
// own comment on this split) — the desk already has the full name lists
// fetched, and this is a soft warning, not an authoritative check.

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, (_, i) => [
    i,
    ...Array<number>(cols - 1).fill(0),
  ]);
  for (let j = 1; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1, // deletion
        dist[i][j - 1] + 1, // insertion
        dist[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return dist[rows - 1][cols - 1];
}

/** True for exact/case/spacing matches, substring matches, and close typos. */
export function isNearMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length < 2 || nb.length < 2) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const threshold = Math.max(1, Math.floor(0.2 * Math.min(na.length, nb.length)));
  return levenshteinDistance(na, nb) <= threshold;
}
