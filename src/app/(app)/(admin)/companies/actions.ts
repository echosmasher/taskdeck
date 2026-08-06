"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { companyHasHistory } from "./history-guard";

export interface CompanyActionState {
  error?: string;
}

async function resolveDimensionSelections(
  formData: FormData,
): Promise<
  { selections: { dimensionId: string; dimensionValueId: string }[] } | { error: string }
> {
  const supabase = await createClient();
  const { data: dimensions, error } = await supabase.from("dimensions").select("id, name");
  if (error) return { error: error.message };

  const selections: { dimensionId: string; dimensionValueId: string }[] = [];
  for (const dimension of dimensions ?? []) {
    const valueId = formData.get(`dimension:${dimension.id}`);
    if (!valueId || typeof valueId !== "string") {
      return { error: `Select a value for ${dimension.name}.` };
    }
    selections.push({ dimensionId: dimension.id, dimensionValueId: valueId });
  }
  return { selections };
}

export async function createCompanyAction(
  _prevState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required." };

  const resolved = await resolveDimensionSelections(formData);
  if ("error" in resolved) return { error: resolved.error };

  const supabase = await createClient();
  const { data: company, error: insertError } = await supabase
    .from("companies")
    .insert({ name })
    .select("id")
    .single();

  if (insertError || !company) {
    return { error: insertError?.message ?? "Failed to create company." };
  }

  const { error: cdvError } = await supabase.from("company_dimension_values").insert(
    resolved.selections.map((s) => ({
      company_id: company.id,
      dimension_id: s.dimensionId,
      dimension_value_id: s.dimensionValueId,
    })),
  );

  if (cdvError) {
    // Compensating cleanup — don't leave a company with incomplete
    // dimension coverage behind.
    await supabase.from("companies").delete().eq("id", company.id);
    return { error: cdvError.message };
  }

  revalidatePath("/companies");
  return {};
}

export async function updateCompanyAction(
  companyId: string,
  _prevState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required." };

  const resolved = await resolveDimensionSelections(formData);
  if ("error" in resolved) return { error: resolved.error };

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("companies")
    .update({ name })
    .eq("id", companyId);
  if (updateError) return { error: updateError.message };

  const { error: deleteError } = await supabase
    .from("company_dimension_values")
    .delete()
    .eq("company_id", companyId);
  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabase.from("company_dimension_values").insert(
    resolved.selections.map((s) => ({
      company_id: companyId,
      dimension_id: s.dimensionId,
      dimension_value_id: s.dimensionValueId,
    })),
  );
  if (insertError) return { error: insertError.message };

  revalidatePath("/companies");
  return {};
}

export async function setCompanyArchivedAction(companyId: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ is_archived: archived })
    .eq("id", companyId);
  if (error) return { error: error.message };

  revalidatePath("/companies");
  return {};
}

export async function deleteCompanyAction(companyId: string): Promise<CompanyActionState> {
  if (await companyHasHistory(companyId)) {
    return { error: "This company has task history and can't be deleted — archive it instead." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) return { error: error.message };

  revalidatePath("/companies");
  return {};
}

export interface ImportCompaniesState {
  error?: string;
  imported?: number;
}

/**
 * Bulk-inserts already-validated rows from the CSV import dialog (task
 * 17) — validation itself (unknown values, duplicates, missing fields)
 * happens client-side in csv-import.ts before this is ever called, so
 * every row here is expected to succeed.
 */
export async function importCompaniesAction(
  rows: { name: string; dimensionValues: Record<string, string> }[],
): Promise<ImportCompaniesState> {
  if (rows.length === 0) return { imported: 0 };

  const supabase = await createClient();
  const { data: inserted, error: insertError } = await supabase
    .from("companies")
    .insert(rows.map((r) => ({ name: r.name })))
    .select("id, name");

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Failed to import companies." };
  }

  const companyIdByName = new Map(inserted.map((c) => [c.name, c.id]));
  const cdvRows = rows.flatMap((r) => {
    const companyId = companyIdByName.get(r.name);
    if (!companyId) return [];
    return Object.entries(r.dimensionValues).map(([dimensionId, dimensionValueId]) => ({
      company_id: companyId,
      dimension_id: dimensionId,
      dimension_value_id: dimensionValueId,
    }));
  });

  if (cdvRows.length > 0) {
    const { error: cdvError } = await supabase.from("company_dimension_values").insert(cdvRows);
    if (cdvError) {
      await supabase
        .from("companies")
        .delete()
        .in("id", [...companyIdByName.values()]);
      return { error: cdvError.message };
    }
  }

  revalidatePath("/companies");
  return { imported: inserted.length };
}
