import { createClient } from "@/lib/supabase/server";
import { CompaniesTable } from "./companies-table";
import type { CompanyWithDimensions, DimensionWithValues } from "./types";

export default async function CompaniesPage() {
  const supabase = await createClient();

  const [companiesRes, dimensionsRes, dimensionValuesRes, cdvRes] = await Promise.all([
    supabase.from("companies").select("id, name, is_archived").order("name"),
    supabase.from("dimensions").select("id, name").order("created_at"),
    supabase.from("dimension_values").select("id, dimension_id, value").order("value"),
    supabase.from("company_dimension_values").select("company_id, dimension_id, dimension_value_id"),
  ]);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Companies</h1>
        <p className="text-muted-foreground">
          Every dimension must be set for a company before it can be saved.
        </p>
      </div>
      <CompaniesTable companies={companies} dimensions={dimensions} />
    </div>
  );
}
