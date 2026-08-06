/**
 * Minimal RFC 4180 CSV parser/formatter — no external dependency for
 * something this small. Handles quoted fields (embedded commas,
 * newlines, and escaped `""`) and both LF and CRLF line endings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAnyContent = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      sawAnyContent = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
      sawAnyContent = true;
    } else if (char === "\r") {
      continue;
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      sawAnyContent = false;
    } else {
      field += char;
      sawAnyContent = true;
    }
  }

  if (sawAnyContent || field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function toCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsvRow(fields: string[]): string {
  return fields.map(toCsvField).join(",");
}

export function toCsv(rows: string[][]): string {
  return rows.map(toCsvRow).join("\r\n");
}
