"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemberOption, TeamOption } from "./types";

export function AssigneeField({
  assigneeType,
  onAssigneeTypeChange,
  assigneeId,
  onAssigneeIdChange,
  teams,
  members,
}: {
  assigneeType: "team" | "person";
  onAssigneeTypeChange: (type: "team" | "person") => void;
  assigneeId: string;
  onAssigneeIdChange: (id: string) => void;
  teams: TeamOption[];
  members: MemberOption[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="assignee_type">Assign to</Label>
        <Select
          name="assignee_type"
          value={assigneeType}
          onValueChange={(value) => {
            if (value === "team" || value === "person") {
              onAssigneeTypeChange(value);
              onAssigneeIdChange("");
            }
          }}
        >
          <SelectTrigger id="assignee_type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="person">Person</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assignee_id">{assigneeType === "team" ? "Team" : "Person"}</Label>
        <Select
          name="assignee_id"
          value={assigneeId}
          onValueChange={(value) => onAssigneeIdChange(value ?? "")}
        >
          <SelectTrigger id="assignee_id" className="w-full">
            <SelectValue placeholder={`Select a ${assigneeType}…`} />
          </SelectTrigger>
          <SelectContent>
            {(assigneeType === "team" ? teams : members).map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {"name" in option ? option.name : option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
