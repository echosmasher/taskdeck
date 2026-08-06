"use client";

import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setCompanyArchivedAction } from "./actions";
import { CompanyFormDialog } from "./company-form-dialog";
import { DeleteCompanyDialog } from "./delete-company-dialog";
import { ManageDimensionsDialog } from "./dimensions/manage-dimensions-dialog";
import type { CompanyWithDimensions, DimensionWithValues } from "./types";

export function CompaniesTable({
  companies,
  dimensions,
  activeCompanies,
}: {
  companies: CompanyWithDimensions[];
  dimensions: DimensionWithValues[];
  activeCompanies: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [manageDimensionsOpen, setManageDimensionsOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithDimensions | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyWithDimensions | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(query));
  }, [companies, search]);

  function valueLabel(company: CompanyWithDimensions, dimension: DimensionWithValues) {
    const valueId = company.values[dimension.id];
    return dimension.values.find((v) => v.id === valueId)?.value ?? "—";
  }

  function toggleArchived(company: CompanyWithDimensions) {
    startTransition(async () => {
      const result = await setCompanyArchivedAction(company.id, !company.is_archived);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(company.is_archived ? "Company unarchived" : "Company archived");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageDimensionsOpen(true)}>
            Manage dimensions
          </Button>
          <Button onClick={() => setCreateOpen(true)}>New company</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {dimensions.map((d) => (
              <TableHead key={d.id}>{d.name}</TableHead>
            ))}
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={dimensions.length + 3} className="text-center text-muted-foreground">
                No companies found.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              {dimensions.map((d) => (
                <TableCell key={d.id}>{valueLabel(company, d)}</TableCell>
              ))}
              <TableCell>
                {company.is_archived ? (
                  <Badge variant="outline">Archived</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" aria-label={`Actions for ${company.name}`} />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingCompany(company)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleArchived(company)}>
                      {company.is_archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeletingCompany(company)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CompanyFormDialog open={createOpen} onOpenChange={setCreateOpen} dimensions={dimensions} />

      <ManageDimensionsDialog
        open={manageDimensionsOpen}
        onOpenChange={setManageDimensionsOpen}
        dimensions={dimensions}
        activeCompanies={activeCompanies}
      />

      {editingCompany && (
        <CompanyFormDialog
          open={!!editingCompany}
          onOpenChange={(open) => !open && setEditingCompany(null)}
          dimensions={dimensions}
          company={editingCompany}
        />
      )}

      {deletingCompany && (
        <DeleteCompanyDialog
          open={!!deletingCompany}
          onOpenChange={(open) => !open && setDeletingCompany(null)}
          companyId={deletingCompany.id}
          companyName={deletingCompany.name}
        />
      )}
    </div>
  );
}
