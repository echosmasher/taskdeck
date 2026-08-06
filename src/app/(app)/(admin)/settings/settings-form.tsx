"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { AppSettings } from "@/lib/app-settings";
import { CALENDAR_STATUSES } from "@/app/(app)/calendar/calendar-status";
import { updateAppSettingsAction } from "./actions";

const CALENDAR_EDIT_PERMISSIONS: {
  value: AppSettings["calendar_edit_permission"];
  label: string;
  help: string;
}[] = [
  {
    value: "admins_only",
    label: "Admins only",
    help: "Members have read-only access to the office calendar.",
  },
  {
    value: "members_own",
    label: "Members edit their own row",
    help: "A member can set their own status; admins can edit anyone's. Recommended default.",
  },
  {
    value: "members_all",
    label: "Members edit anyone's row",
    help: "Any signed-in member can edit any row. Suits small, high-trust teams.",
  },
];

// in_office and remote are explicitly not absence (addendum §15.3.1),
// so they aren't offered as long-absence statuses.
const ABSENCE_STATUS_OPTIONS = CALENDAR_STATUSES.filter(
  (s) => s.value !== "in_office" && s.value !== "remote",
);

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [calendarEditPermission, setCalendarEditPermission] = useState(
    settings.calendar_edit_permission,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateAppSettingsAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Settings saved");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-8">
      <div className="space-y-2">
        <Label htmlFor="calendar_edit_permission">Office calendar edit permission</Label>
        <input type="hidden" name="calendar_edit_permission" value={calendarEditPermission} />
        <Select
          value={calendarEditPermission}
          onValueChange={(v) => setCalendarEditPermission(v as AppSettings["calendar_edit_permission"])}
        >
          <SelectTrigger id="calendar_edit_permission" className="w-full">
            <SelectValue>
              {(v: AppSettings["calendar_edit_permission"]) =>
                CALENDAR_EDIT_PERMISSIONS.find((p) => p.value === v)?.label ?? v
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CALENDAR_EDIT_PERMISSIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {CALENDAR_EDIT_PERMISSIONS.find((p) => p.value === calendarEditPermission)?.help}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Long-term absence statuses</Label>
        <p className="text-sm text-muted-foreground">
          Statuses that always count as long-term absence, regardless of how many consecutive
          days they run for.
        </p>
        <div className="flex flex-col gap-2">
          {ABSENCE_STATUS_OPTIONS.map((s) => (
            <label key={s.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="long_absence_statuses"
                value={s.value}
                defaultChecked={settings.long_absence_statuses.includes(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="long_absence_min_days">Long-absence threshold (consecutive days)</Label>
        <Input
          id="long_absence_min_days"
          name="long_absence_min_days"
          type="number"
          min={1}
          step={1}
          className="w-32"
          defaultValue={settings.long_absence_min_days}
        />
        <p className="text-sm text-muted-foreground">
          A run of consecutive &ldquo;Out of office&rdquo; days at or above this length also
          counts as long-term absence, even though &ldquo;Out of office&rdquo; isn&apos;t in the
          list above by default. Weekends and holidays don&apos;t break a run.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          list="timezone-options"
          defaultValue={settings.timezone}
          placeholder="Europe/Oslo"
        />
        <datalist id="timezone-options">
          {typeof Intl.supportedValuesOf === "function" &&
            Intl.supportedValuesOf("timeZone").map((tz) => <option key={tz} value={tz} />)}
        </datalist>
        <p className="text-sm text-muted-foreground">
          What &ldquo;today&rdquo; means for overdue checks, dashboard greetings, and instance
          generation.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
