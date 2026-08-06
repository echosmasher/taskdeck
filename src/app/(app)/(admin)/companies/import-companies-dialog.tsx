"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importCompaniesAction } from "./actions";
import { buildCompaniesCsvTemplate, buildImportErrorsCsv, parseCompaniesCsv } from "./csv-import";
import type { ImportRow } from "./csv-import";
import type { CompanyWithDimensions, DimensionWithValues } from "./types";

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportCompaniesDialog({
  open,
  onOpenChange,
  dimensions,
  companies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensions: DimensionWithValues[];
  companies: CompanyWithDimensions[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [headerError, setHeaderError] = useState<string>();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isPending, startTransition] = useTransition();

  const validRows = rows.filter((r) => r.errors.length === 0);
  const failedRows = rows.filter((r) => r.errors.length > 0);

  function reset() {
    setFileName(undefined);
    setHeaderError(undefined);
    setRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const existingNames = companies.filter((c) => !c.is_archived).map((c) => c.name);
      const result = parseCompaniesCsv(text, dimensions, existingNames);
      setHeaderError(result.headerError);
      setRows(result.rows);
    };
    reader.readAsText(file);
  }

  function dimensionValueLabel(row: ImportRow, dimension: DimensionWithValues) {
    const valueId = row.dimensionValues[dimension.id];
    return dimension.values.find((v) => v.id === valueId)?.value ?? "—";
  }

  function handleImport() {
    startTransition(async () => {
      const result = await importCompaniesAction(
        validRows.map((r) => ({ name: r.name, dimensionValues: r.dimensionValues })),
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Imported ${result.imported} ${result.imported === 1 ? "company" : "companies"}`);
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import companies from CSV</DialogTitle>
          <DialogDescription>
            Download the template for the current dimensions, fill it in, then upload it below.
            Nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadTextFile(
                "companies-template.csv",
                buildCompaniesCsvTemplate(dimensions),
                "text/csv",
              )
            }
          >
            Download template
          </Button>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            {fileName ?? "Choose CSV file…"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {headerError && (
          <p role="alert" className="text-sm text-destructive">
            {headerError}
          </p>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {validRows.length} valid, {failedRows.length} with errors
              </p>
              {failedRows.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    downloadTextFile(
                      "companies-import-errors.csv",
                      buildImportErrorsCsv(failedRows, dimensions),
                      "text/csv",
                    )
                  }
                >
                  Download errors CSV
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Name</TableHead>
                    {dimensions.map((d) => (
                      <TableHead key={d.id}>{d.name}</TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                      <TableCell className="font-medium">{row.name || "—"}</TableCell>
                      {dimensions.map((d) => (
                        <TableCell key={d.id}>{dimensionValueLabel(row, d)}</TableCell>
                      ))}
                      <TableCell>
                        {row.errors.length === 0 ? (
                          <Badge variant="secondary">Valid</Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {row.errors.map((err) => (
                              <Badge key={err} variant="destructive">
                                {err}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending || validRows.length === 0} onClick={handleImport}>
            {isPending ? "Importing…" : `Import ${validRows.length} ${validRows.length === 1 ? "company" : "companies"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
