import { describe, expect, it } from "vitest";
import { parseCsv, toCsv, toCsvRow } from "./csv";

describe("parseCsv", () => {
  it("parses a simple grid", () => {
    expect(parseCsv("name,country\nAcme,Norway\nNordkyst,Sweden")).toEqual([
      ["name", "country"],
      ["Acme", "Norway"],
      ["Nordkyst", "Sweden"],
    ]);
  });

  it("handles a trailing newline without adding a phantom row", () => {
    expect(parseCsv("name,country\nAcme,Norway\n")).toEqual([
      ["name", "country"],
      ["Acme", "Norway"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("name,country\r\nAcme,Norway\r\n")).toEqual([
      ["name", "country"],
      ["Acme", "Norway"],
    ]);
  });

  it("keeps a blank line as an empty row", () => {
    expect(parseCsv("a,b\n\nc,d")).toEqual([["a", "b"], [""], ["c", "d"]]);
  });

  it("unquotes a quoted field with an embedded comma", () => {
    expect(parseCsv('name,note\nAcme,"Oslo, Norway"')).toEqual([
      ["name", "note"],
      ["Acme", "Oslo, Norway"],
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsv('name,note\nAcme,"Say ""hi"""')).toEqual([
      ["name", "note"],
      ["Acme", 'Say "hi"'],
    ]);
  });

  it("preserves an embedded newline inside a quoted field", () => {
    expect(parseCsv('name,note\nAcme,"line1\nline2"')).toEqual([
      ["name", "note"],
      ["Acme", "line1\nline2"],
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("toCsvRow", () => {
  it("joins plain fields with commas", () => {
    expect(toCsvRow(["Acme", "Norway"])).toBe("Acme,Norway");
  });

  it("quotes a field containing a comma", () => {
    expect(toCsvRow(["Acme", "Oslo, Norway"])).toBe('Acme,"Oslo, Norway"');
  });

  it("escapes quotes inside a quoted field", () => {
    expect(toCsvRow(["Acme", 'Say "hi"'])).toBe('Acme,"Say ""hi"""');
  });
});

describe("toCsv / parseCsv round-trip", () => {
  it("survives a value containing a comma and a quote", () => {
    const rows = [
      ["name", "note"],
      ["Acme AS", 'Oslo, "the capital"'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
