export interface DimensionWithValues {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}

export interface CompanyWithDimensions {
  id: string;
  name: string;
  is_archived: boolean;
  /** dimensionId -> dimensionValueId */
  values: Record<string, string>;
}
