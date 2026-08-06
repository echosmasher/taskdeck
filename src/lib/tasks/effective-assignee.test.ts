import { describe, expect, it } from "vitest";
import { resolveEffectiveAssignee } from "./effective-assignee";

describe("resolveEffectiveAssignee", () => {
  it("returns the task's person assignee when there's no override", () => {
    const task = { assigneeType: "person" as const, assigneeTeamId: null, assigneeProfileId: "anna" };
    expect(resolveEffectiveAssignee(task, null)).toEqual({
      type: "person",
      teamId: null,
      profileId: "anna",
      isOverride: false,
    });
  });

  it("returns the task's team assignee when there's no override", () => {
    const task = { assigneeType: "team" as const, assigneeTeamId: "ar-team", assigneeProfileId: null };
    expect(resolveEffectiveAssignee(task, null)).toEqual({
      type: "team",
      teamId: "ar-team",
      profileId: null,
      isOverride: false,
    });
  });

  it("overrides a person assignee with the covering profile", () => {
    const task = { assigneeType: "person" as const, assigneeTeamId: null, assigneeProfileId: "anna" };
    expect(resolveEffectiveAssignee(task, "erik")).toEqual({
      type: "person",
      teamId: null,
      profileId: "erik",
      isOverride: true,
    });
  });

  it("overrides a team assignee with the covering profile", () => {
    const task = { assigneeType: "team" as const, assigneeTeamId: "ar-team", assigneeProfileId: null };
    expect(resolveEffectiveAssignee(task, "erik")).toEqual({
      type: "person",
      teamId: null,
      profileId: "erik",
      isOverride: true,
    });
  });
});
