"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DimensionOption } from "./types";

export function ScopeField({
  dimensions,
  selected,
  onChange,
}: {
  dimensions: DimensionOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  function toggle(valueId: string, checked: boolean) {
    onChange(checked ? [...selected, valueId] : selected.filter((id) => id !== valueId));
  }

  return (
    <div className="space-y-3">
      {selected.map((valueId) => (
        <input key={valueId} type="hidden" name="scope" value={valueId} />
      ))}
      <Label>Scope</Label>
      <p className="text-xs text-muted-foreground">
        Leave everything unchecked to apply to all companies. Within a dimension, checking
        multiple values means &ldquo;any of these&rdquo;; across dimensions, every one you set
        must match.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {dimensions.map((dimension) => (
          <div key={dimension.id} className="space-y-1.5">
            <p className="text-sm font-medium">{dimension.name}</p>
            {dimension.values.map((value) => (
              <label
                key={value.id}
                className="flex items-center gap-2 text-sm font-normal"
                htmlFor={`scope-${value.id}`}
              >
                <Checkbox
                  id={`scope-${value.id}`}
                  checked={selected.includes(value.id)}
                  onCheckedChange={(checked) => toggle(value.id, checked)}
                />
                {value.value}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
