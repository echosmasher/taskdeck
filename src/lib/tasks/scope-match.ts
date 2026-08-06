/**
 * Whether a company matches a task's scope (§4, §14): empty scope means
 * "all companies"; otherwise a company matches when, for every dimension
 * that has at least one value in scope, the company's own value for
 * that dimension is one of them — OR within a dimension, AND across
 * dimensions. A company missing a value for a scoped dimension never
 * matches (rather than silently matching by omission) — that gap is
 * what the incomplete-data warning (task 7) exists to surface.
 */
export function companyMatchesScope(
  scope: readonly string[],
  companyDimensionValues: ReadonlyMap<string, string>,
  dimensionValueToDimension: ReadonlyMap<string, string>,
): boolean {
  if (scope.length === 0) return true;

  const scopeByDimension = new Map<string, string[]>();
  for (const valueId of scope) {
    const dimensionId = dimensionValueToDimension.get(valueId);
    if (!dimensionId) continue; // stale/deleted dimension value id — ignore
    const existing = scopeByDimension.get(dimensionId);
    if (existing) existing.push(valueId);
    else scopeByDimension.set(dimensionId, [valueId]);
  }

  for (const [dimensionId, allowedValueIds] of scopeByDimension) {
    const companyValueId = companyDimensionValues.get(dimensionId);
    if (!companyValueId || !allowedValueIds.includes(companyValueId)) return false;
  }
  return true;
}
