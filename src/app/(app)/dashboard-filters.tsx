"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DashboardDimensionOption, DashboardFilterOption } from "./dashboard-types";

const ANY = "any";

export interface DashboardFilterState {
  teamId: string | null;
  assigneeId: string | null;
  dimensionValues: Record<string, string | null>;
}

export function DashboardFilters({
  teamOptions,
  assigneeOptions,
  dimensionOptions,
  value,
  onChange,
}: {
  teamOptions: DashboardFilterOption[];
  assigneeOptions: DashboardFilterOption[];
  dimensionOptions: DashboardDimensionOption[];
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.teamId ?? ANY}
        onValueChange={(v) => onChange({ ...value, teamId: v === ANY ? null : v })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by team">
          {/* SelectValue doesn't derive its label from the matching
              SelectItem's children in this base-ui setup — it renders the
              raw value — so the label lookup has to be explicit here. */}
          <SelectValue>
            {(v: string) => teamOptions.find((t) => t.id === v)?.label ?? "Any team"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any team</SelectItem>
          {teamOptions.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.assigneeId ?? ANY}
        onValueChange={(v) => onChange({ ...value, assigneeId: v === ANY ? null : v })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by assignee">
          <SelectValue>
            {(v: string) => assigneeOptions.find((a) => a.id === v)?.label ?? "Any assignee"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any assignee</SelectItem>
          {assigneeOptions.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {dimensionOptions.map((dim) => (
        <Select
          key={dim.id}
          value={value.dimensionValues[dim.id] ?? ANY}
          onValueChange={(v) =>
            onChange({
              ...value,
              dimensionValues: { ...value.dimensionValues, [dim.id]: v === ANY ? null : v },
            })
          }
        >
          <SelectTrigger className="w-40" aria-label={`Filter by ${dim.name}`}>
            <SelectValue>
              {(v: string) => dim.values.find((val) => val.id === v)?.value ?? `Any ${dim.name}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any {dim.name}</SelectItem>
            {dim.values.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
