import { describe, expect, it } from "vitest";
import { buildCompaniesCsvTemplate, buildImportErrorsCsv, parseCompaniesCsv } from "./csv-import";
import type { DimensionWithValues } from "./types";

const DIMENSIONS: DimensionWithValues[] = [
  {
    id: "dim-country",
    name: "Country",
    values: [
      { id: "val-no", value: "Norway" },
      { id: "val-se", value: "Sweden" },
    ],
  },
  {
    id: "dim-brand",
    name: "Brand",
    values: [{ id: "val-nordvik", value: "Nordvik" }],
  },
];

describe("buildCompaniesCsvTemplate", () => {
  it("headers with name followed by each dimension name", () => {
    expect(buildCompaniesCsvTemplate(DIMENSIONS)).toBe("name,Country,Brand\r\n");
  });

  it("is just the name column when there are no dimensions", () => {
    expect(buildCompaniesCsvTemplate([])).toBe("name\r\n");
  });
});

describe("parseCompaniesCsv", () => {
  it("accepts a fully valid file", () => {
    const csv = "name,Country,Brand\nAcme AS,Norway,Nordvik\nNordkyst AS,Sweden,Nordvik";
    const result = parseCompaniesCsv(csv, DIMENSIONS, []);
    expect(result.headerError).toBeUndefined();
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((r) => r.errors.length === 0)).toBe(true);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 1,
      name: "Acme AS",
      dimensionValues: { "dim-country": "val-no", "dim-brand": "val-nordvik" },
    });
  });

  it("matches dimension values case-insensitively", () => {
    const csv = "name,Country,Brand\nAcme AS,norway,NORDVIK";
    const result = parseCompaniesCsv(csv, DIMENSIONS, []);
    expect(result.rows[0].errors).toEqual([]);
  });

  it("flags an empty file", () => {
    expect(parseCompaniesCsv("", DIMENSIONS, []).headerError).toBe("The file is empty.");
  });

  it("flags a wrong first column", () => {
    const result = parseCompaniesCsv("company,Country,Brand\nAcme,Norway,Nordvik", DIMENSIONS, []);
    expect(result.headerError).toBe('The first column must be "name".');
  });

  it("flags a missing dimension column", () => {
    const result = parseCompaniesCsv("name,Country\nAcme,Norway", DIMENSIONS, []);
    expect(result.headerError).toBe('Missing column for dimension "Brand".');
  });

  it("tolerates dimension columns in a different order than the template", () => {
    const csv = "name,Brand,Country\nAcme AS,Nordvik,Norway";
    const result = parseCompaniesCsv(csv, DIMENSIONS, []);
    expect(result.headerError).toBeUndefined();
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[0].dimensionValues).toEqual({
      "dim-country": "val-no",
      "dim-brand": "val-nordvik",
    });
  });

  it("flags a missing company name", () => {
    const result = parseCompaniesCsv("name,Country,Brand\n,Norway,Nordvik", DIMENSIONS, []);
    expect(result.rows[0].errors).toContain("Missing company name");
  });

  it("flags an unknown dimension value", () => {
    const result = parseCompaniesCsv("name,Country,Brand\nAcme,Atlantis,Nordvik", DIMENSIONS, []);
    expect(result.rows[0].errors).toContain('Unknown Country value "Atlantis"');
  });

  it("flags a missing required dimension cell", () => {
    const result = parseCompaniesCsv("name,Country,Brand\nAcme,,Nordvik", DIMENSIONS, []);
    expect(result.rows[0].errors).toContain("Missing Country");
  });

  it("flags a name that duplicates an existing company", () => {
    const result = parseCompaniesCsv("name,Country,Brand\nAcme AS,Norway,Nordvik", DIMENSIONS, [
      "Acme AS",
    ]);
    expect(result.rows[0].errors).toContain("Duplicate company name");
  });

  it("matches existing-name duplicates case-insensitively", () => {
    const result = parseCompaniesCsv("name,Country,Brand\nacme as,Norway,Nordvik", DIMENSIONS, [
      "Acme AS",
    ]);
    expect(result.rows[0].errors).toContain("Duplicate company name");
  });

  it("flags the second of two rows sharing a name within the file", () => {
    const csv = "name,Country,Brand\nAcme AS,Norway,Nordvik\nAcme AS,Sweden,Nordvik";
    const result = parseCompaniesCsv(csv, DIMENSIONS, []);
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[1].errors).toContain("Duplicate company name");
  });

  it("still flags a later duplicate even when the first occurrence had its own error", () => {
    // First "Acme AS" row is invalid for an unrelated reason (bad
    // country), which must not suppress the duplicate-name flag on the
    // second occurrence.
    const csv = "name,Country,Brand\nAcme AS,Atlantis,Nordvik\nAcme AS,Norway,Nordvik";
    const result = parseCompaniesCsv(csv, DIMENSIONS, []);
    expect(result.rows[0].errors).toContain('Unknown Country value "Atlantis"');
    expect(result.rows[1].errors).toContain("Duplicate company name");
  });

  it("ignores blank lines", () => {
    const csv = "name,Country,Brand\nAcme AS,Norway,Nordvik\n\nNordkyst AS,Sweden,Nordvik\n";
    const result = parseCompaniesCsv(csv, DIMENSIONS, []);
    expect(result.rows).toHaveLength(2);
  });

  it("works with zero dimensions", () => {
    const result = parseCompaniesCsv("name\nAcme AS\nNordkyst AS", [], []);
    expect(result.headerError).toBeUndefined();
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((r) => r.errors.length === 0)).toBe(true);
  });
});

describe("buildImportErrorsCsv", () => {
  it("lists only the failed rows with their reasons", () => {
    const csv = "name,Country,Brand\nAcme,Atlantis,Nordvik\nNordkyst AS,Sweden,Nordvik";
    const { rows } = parseCompaniesCsv(csv, DIMENSIONS, []);
    const failed = rows.filter((r) => r.errors.length > 0);
    const errorsCsv = buildImportErrorsCsv(failed, DIMENSIONS);
    expect(errorsCsv).toBe('row,name,Country,Brand,errors\r\n1,Acme,,Nordvik,"Unknown Country value ""Atlantis"""');
  });
});
