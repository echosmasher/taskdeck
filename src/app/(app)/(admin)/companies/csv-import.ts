import { parseCsv, toCsv } from "@/lib/csv";
import type { DimensionWithValues } from "./types";

export interface ImportRow {
  /** 1-based, counting only data rows (header excluded) — for user-facing reference. */
  rowNumber: number;
  name: string;
  /** dimensionId -> dimensionValueId. Only fully populated when `errors` is empty. */
  dimensionValues: Record<string, string>;
  errors: string[];
}

export interface ParseResult {
  headerError?: string;
  rows: ImportRow[];
}

/** name,<dimension1>,<dimension2>,… — the template this validates against. */
export function buildCompaniesCsvTemplate(dimensions: DimensionWithValues[]): string {
  return ["name", ...dimensions.map((d) => d.name)].join(",") + "\r\n";
}

function isBlankRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "");
}

export function parseCompaniesCsv(
  csvText: string,
  dimensions: DimensionWithValues[],
  existingNames: string[],
): ParseResult {
  const raw = parseCsv(csvText).filter((row) => !isBlankRow(row));
  if (raw.length === 0) return { headerError: "The file is empty.", rows: [] };

  const header = raw[0].map((h) => h.trim());
  if (header[0]?.toLowerCase() !== "name") {
    return { headerError: 'The first column must be "name".', rows: [] };
  }

  const columnIndexByDimension = new Map<string, number>();
  for (const dimension of dimensions) {
    const index = header.findIndex((h) => h.toLowerCase() === dimension.name.toLowerCase());
    if (index === -1) {
      return { headerError: `Missing column for dimension "${dimension.name}".`, rows: [] };
    }
    columnIndexByDimension.set(dimension.id, index);
  }

  const seenNames = new Set(existingNames.map((n) => n.toLowerCase()));
  const rows: ImportRow[] = [];

  raw.slice(1).forEach((cells, i) => {
    const name = (cells[0] ?? "").trim();
    const errors: string[] = [];
    const dimensionValues: Record<string, string> = {};

    if (!name) {
      errors.push("Missing company name");
    } else if (seenNames.has(name.toLowerCase())) {
      errors.push("Duplicate company name");
    } else {
      // Registered as soon as it's used (not gated on the row being
      // otherwise valid) so a later row repeating this name is always
      // flagged, even if this first occurrence has an unrelated error.
      seenNames.add(name.toLowerCase());
    }

    for (const dimension of dimensions) {
      const columnIndex = columnIndexByDimension.get(dimension.id)!;
      const cellValue = (cells[columnIndex] ?? "").trim();
      if (!cellValue) {
        errors.push(`Missing ${dimension.name}`);
        continue;
      }
      const match = dimension.values.find((v) => v.value.toLowerCase() === cellValue.toLowerCase());
      if (!match) {
        errors.push(`Unknown ${dimension.name} value "${cellValue}"`);
        continue;
      }
      dimensionValues[dimension.id] = match.id;
    }

    rows.push({ rowNumber: i + 1, name, dimensionValues, errors });
  });

  return { rows };
}

/** Downloadable CSV of just the failed rows, with the original raw name and why each one failed. */
export function buildImportErrorsCsv(
  failedRows: ImportRow[],
  dimensions: DimensionWithValues[],
): string {
  const header = ["row", "name", ...dimensions.map((d) => d.name), "errors"];
  const body = failedRows.map((r) => [
    String(r.rowNumber),
    r.name,
    ...dimensions.map((d) => {
      const valueId = r.dimensionValues[d.id];
      return d.values.find((v) => v.id === valueId)?.value ?? "";
    }),
    r.errors.join("; "),
  ]);
  return toCsv([header, ...body]);
}
