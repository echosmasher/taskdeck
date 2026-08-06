"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface DimensionActionState {
  error?: string;
  dimensionId?: string;
  dimensionName?: string;
  values?: { id: string; value: string }[];
}

export async function createDimensionAction(
  _prevState: DimensionActionState,
  formData: FormData,
): Promise<DimensionActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Dimension name is required." };

  const values = formData
    .getAll("value")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (values.length === 0) return { error: "Add at least one value." };

  const supabase = await createClient();
  const { data: dimension, error: dimensionError } = await supabase
    .from("dimensions")
    .insert({ name })
    .select("id")
    .single();

  if (dimensionError || !dimension) {
    return { error: dimensionError?.message ?? "Failed to create dimension." };
  }

  const { data: insertedValues, error: valuesError } = await supabase
    .from("dimension_values")
    .insert(values.map((value) => ({ dimension_id: dimension.id, value })))
    .select("id, value");

  if (valuesError || !insertedValues) {
    await supabase.from("dimensions").delete().eq("id", dimension.id);
    return { error: valuesError?.message ?? "Failed to create dimension values." };
  }

  revalidatePath("/companies");
  return { dimensionId: dimension.id, dimensionName: name, values: insertedValues };
}

export interface AddValueState {
  error?: string;
}

export async function addDimensionValueAction(
  dimensionId: string,
  _prevState: AddValueState,
  formData: FormData,
): Promise<AddValueState> {
  const value = String(formData.get("value") ?? "").trim();
  if (!value) return { error: "Value is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dimension_values")
    .insert({ dimension_id: dimensionId, value });

  if (error) return { error: error.message };

  revalidatePath("/companies");
  return {};
}

export async function renameDimensionValueAction(valueId: string, newValue: string) {
  const trimmed = newValue.trim();
  if (!trimmed) return { error: "Value can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dimension_values")
    .update({ value: trimmed })
    .eq("id", valueId);

  if (error) return { error: error.message };

  revalidatePath("/companies");
  return {};
}

export async function backfillCompanyDimensionValuesAction(
  dimensionId: string,
  selections: { companyId: string; dimensionValueId: string }[],
) {
  const filled = selections.filter((s) => s.dimensionValueId);
  if (filled.length === 0) {
    revalidatePath("/companies");
    return {};
  }

  const supabase = await createClient();
  const { error } = await supabase.from("company_dimension_values").insert(
    filled.map((s) => ({
      company_id: s.companyId,
      dimension_id: dimensionId,
      dimension_value_id: s.dimensionValueId,
    })),
  );

  if (error) return { error: error.message };

  revalidatePath("/companies");
  return {};
}
