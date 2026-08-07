import { describe, expect, it } from "vitest";
import { companyMatchesScope } from "./scope-match";

// Dimensions: Country (dim-country) has values NO/SE; Brand (dim-brand) has values Nordvik/Havstad.
const dimValueToDimension = new Map([
  ["val-no", "dim-country"],
  ["val-se", "dim-country"],
  ["val-nordvik", "dim-brand"],
  ["val-havstad", "dim-brand"],
]);

describe("companyMatchesScope", () => {
  it("matches everything when scope is empty", () => {
    const company = new Map();
    expect(companyMatchesScope([], company, dimValueToDimension)).toBe(true);
  });

  it("matches a company whose value is in scope for a single dimension", () => {
    const company = new Map([["dim-country", "val-no"]]);
    expect(companyMatchesScope(["val-no"], company, dimValueToDimension)).toBe(true);
  });

  it("rejects a company whose value is not in scope for that dimension", () => {
    const company = new Map([["dim-country", "val-se"]]);
    expect(companyMatchesScope(["val-no"], company, dimValueToDimension)).toBe(false);
  });

  it("is OR within a dimension: either scoped country value matches", () => {
    const scope = ["val-no", "val-se"];
    const noCompany = new Map([["dim-country", "val-no"]]);
    const seCompany = new Map([["dim-country", "val-se"]]);
    expect(companyMatchesScope(scope, noCompany, dimValueToDimension)).toBe(true);
    expect(companyMatchesScope(scope, seCompany, dimValueToDimension)).toBe(true);
  });

  it("is AND across dimensions: must match country AND brand", () => {
    const scope = ["val-no", "val-nordvik"];
    const matches = new Map([
      ["dim-country", "val-no"],
      ["dim-brand", "val-nordvik"],
    ]);
    const rightCountryWrongBrand = new Map([
      ["dim-country", "val-no"],
      ["dim-brand", "val-havstad"],
    ]);
    expect(companyMatchesScope(scope, matches, dimValueToDimension)).toBe(true);
    expect(companyMatchesScope(scope, rightCountryWrongBrand, dimValueToDimension)).toBe(false);
  });

  it("rejects a company missing a value for a scoped dimension, rather than treating it as a wildcard", () => {
    const scope = ["val-no"];
    const noCountryValue = new Map([["dim-brand", "val-nordvik"]]);
    expect(companyMatchesScope(scope, noCountryValue, dimValueToDimension)).toBe(false);
  });

  it("ignores a stale/unknown dimension value id in scope without breaking other dimensions", () => {
    const scope = ["val-does-not-exist", "val-nordvik"];
    const company = new Map([["dim-brand", "val-nordvik"]]);
    expect(companyMatchesScope(scope, company, dimValueToDimension)).toBe(true);
  });
});
