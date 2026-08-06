"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeadlineRule } from "@/lib/tasks/recurrence-types";

export function DeadlineRuleField({
  value,
  onChange,
  countries,
}: {
  value: DeadlineRule;
  onChange: (rule: DeadlineRule) => void;
  countries: string[];
}) {
  const enabled = value !== null;

  return (
    <div className="space-y-3">
      <input type="hidden" name="deadline_rule" value={value ? JSON.stringify(value) : ""} />
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor="deadline_rule_toggle">
        <Checkbox
          id="deadline_rule_toggle"
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange(checked ? { offsetDays: 0, offsetType: "calendar" } : null)
          }
        />
        Deadline differs from the recurrence date
      </label>

      {enabled && (
        <div className="grid grid-cols-2 gap-3 pl-6">
          <div className="space-y-2">
            <Label htmlFor="deadline_offset_days">Offset (days)</Label>
            <Input
              id="deadline_offset_days"
              type="number"
              value={value.offsetDays}
              onChange={(e) => onChange({ ...value, offsetDays: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline_offset_type">Offset type</Label>
            <Select
              value={value.offsetType}
              onValueChange={(offsetType) =>
                onChange(
                  offsetType === "working"
                    ? { offsetDays: value.offsetDays, offsetType: "working", countryCode: countries[0] }
                    : { offsetDays: value.offsetDays, offsetType: "calendar" },
                )
              }
            >
              <SelectTrigger id="deadline_offset_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar days</SelectItem>
                <SelectItem value="working">Working days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {value.offsetType === "working" && (
            <div className="col-span-2 space-y-2">
              <Label htmlFor="deadline_country">Country</Label>
              <Select
                value={value.countryCode}
                onValueChange={(countryCode) =>
                  onChange({ ...value, countryCode: countryCode ?? undefined })
                }
              >
                <SelectTrigger id="deadline_country" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
