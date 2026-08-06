import { createClient } from "@/lib/supabase/server";
import { CompaniesTable } from "./companies-table";
import { IncompleteDataWarning } from "./incomplete-data-warning";
import type { CompanyWithDimensions, DimensionWithValues } from "./types";

export default async function CompaniesPage() {
  const supabase = await createClient();

  const [companiesRes, dimensionsRes, dimensionValuesRes, cdvRes, missingRes] = await Promise.all(
    [
      supabase.from("companies").select("id, name, is_archived").order("name"),
      supabase.from("dimensions").select("id, name").order("created_at"),
      supabase.from("dimension_values").select("id, dimension_id, value").order("value"),
      supabase
        .from("company_dimension_values")
        .select("company_id, dimension_id, dimension_value_id"),
      supabase.from("companies_missing_dimension_values").select("*"),
    ],
  );

  const dimensions: DimensionWithValues[] = (dimensionsRes.data ?? []).map((dim) => ({
    id: dim.id,
    name: dim.name,
    values: (dimensionValuesRes.data ?? [])
      .filter((v) => v.dimension_id === dim.id)
      .map((v) => ({ id: v.id, value: v.value })),
  }));

  const companies: CompanyWithDimensions[] = (companiesRes.data ?? []).map((company) => ({
    id: company.id,
    name: company.name,
    is_archived: company.is_archived,
    values: Object.fromEntries(
      (cdvRes.data ?? [])
        .filter((cdv) => cdv.company_id === company.id)
        .map((cdv) => [cdv.dimension_id, cdv.dimension_value_id]),
    ),
  }));

  const activeCompanies = companies
    .filter((c) => !c.is_archived)
    .map((c) => ({ id: c.id, name: c.name }));

  const missingRows = (missingRes.data ?? []).filter(
    (row): row is NonNullable<typeof row> & Record<"company_id" | "company_name" | "dimension_id" | "dimension_name", string> =>
      !!row.company_id && !!row.company_name && !!row.dimension_id && !!row.dimension_name,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Companies</h1>
        <p className="text-muted-foreground">
          Every dimension must be set for a company before it can be saved.
        </p>
      </div>
      <IncompleteDataWarning rows={missingRows} />
      <CompaniesTable companies={companies} dimensions={dimensions} activeCompanies={activeCompanies} />
    </div>
  );
}
