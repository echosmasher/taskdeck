"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Recurrence } from "@/lib/tasks/recurrence-types";
import { WEEKDAY_LABELS } from "@/lib/tasks/recurrence-types";

const DEFAULT_COUNTRY = "NO";

function defaultForType(type: Recurrence["type"]): Recurrence {
  switch (type) {
    case "one_off":
      return { type: "one_off", date: "" };
    case "weekly":
      return { type: "weekly", weekday: 1 };
    case "monthly_fixed":
      return { type: "monthly_fixed", dayOfMonth: 1 };
    case "monthly_nth_working_day":
      return { type: "monthly_nth_working_day", n: 1, countryCode: DEFAULT_COUNTRY };
  }
}

export function RecurrenceField({
  value,
  onChange,
  countries,
}: {
  value: Recurrence;
  onChange: (recurrence: Recurrence) => void;
  countries: string[];
}) {
  return (
    <div className="space-y-3">
      <input type="hidden" name="recurrence" value={JSON.stringify(value)} />
      <div className="space-y-2">
        <Label htmlFor="recurrence_type">Recurrence</Label>
        <Select
          value={value.type}
          onValueChange={(type) => onChange(defaultForType(type as Recurrence["type"]))}
        >
          <SelectTrigger id="recurrence_type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_off">One-off</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly_fixed">Monthly, fixed date</SelectItem>
            <SelectItem value="monthly_nth_working_day">Monthly, Nth working day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.type === "one_off" && (
        <div className="space-y-2">
          <Label htmlFor="recurrence_date">Due date</Label>
          <Input
            id="recurrence_date"
            type="date"
            value={value.date}
            onChange={(e) => onChange({ type: "one_off", date: e.target.value })}
          />
        </div>
      )}

      {value.type === "weekly" && (
        <div className="space-y-2">
          <Label htmlFor="recurrence_weekday">Weekday</Label>
          <Select
            value={String(value.weekday)}
            onValueChange={(weekday) =>
              onChange({ type: "weekly", weekday: Number(weekday) as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
            }
          >
            <SelectTrigger id="recurrence_weekday" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value.type === "monthly_fixed" && (
        <div className="space-y-2">
          <Label htmlFor="recurrence_day_of_month">Day of month</Label>
          <Input
            id="recurrence_day_of_month"
            type="number"
            min={1}
            max={31}
            value={value.dayOfMonth}
            onChange={(e) =>
              onChange({ type: "monthly_fixed", dayOfMonth: Number(e.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Clamped to the last day of shorter months.
          </p>
        </div>
      )}

      {value.type === "monthly_nth_working_day" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="recurrence_n">Nth working day</Label>
            <Input
              id="recurrence_n"
              type="number"
              value={value.n}
              onChange={(e) =>
                onChange({ ...value, n: Number(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              Negative counts from month end (-1 = last working day).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurrence_country">Country</Label>
            <Select
              value={value.countryCode}
              onValueChange={(countryCode) =>
                onChange({ ...value, countryCode: countryCode ?? value.countryCode })
              }
            >
              <SelectTrigger id="recurrence_country" className="w-full">
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
        </div>
      )}
    </div>
  );
}
