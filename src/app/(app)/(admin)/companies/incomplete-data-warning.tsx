import { TriangleAlert } from "lucide-react";

export interface MissingDimensionValue {
  company_id: string;
  company_name: string;
  dimension_id: string;
  dimension_name: string;
}

export function IncompleteDataWarning({ rows }: { rows: MissingDimensionValue[] }) {
  if (rows.length === 0) return null;

  const byCompany = new Map<string, { name: string; dimensions: string[] }>();
  for (const row of rows) {
    const entry = byCompany.get(row.company_id) ?? { name: row.company_name, dimensions: [] };
    entry.dimensions.push(row.dimension_name);
    byCompany.set(row.company_id, entry);
  }

  return (
    <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">
          {byCompany.size} {byCompany.size === 1 ? "company is" : "companies are"} missing
          dimension values
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {[...byCompany.entries()].map(([companyId, entry]) => (
            <li key={companyId}>
              {entry.name} — missing {entry.dimensions.join(", ")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
