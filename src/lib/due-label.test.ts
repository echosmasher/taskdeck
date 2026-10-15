import { describe, expect, it } from "vitest";
import { dueLabel, initialsOf, stampDate } from "./due-label";

describe("dueLabel", () => {
  const today = "2026-10-15";
  it("labels today, tomorrow and overdue distances", () => {
    expect(dueLabel("2026-10-15", today)).toBe("Due today");
    expect(dueLabel("2026-10-16", today)).toBe("Due tomorrow");
    expect(dueLabel("2026-10-14", today)).toBe("1 day overdue");
    expect(dueLabel("2026-09-10", today)).toBe("35 days overdue");
  });
  it("prints a short date for later due dates", () => {
    expect(dueLabel("2026-10-20", today)).toMatch(/Tue/);
  });
});

describe("initialsOf", () => {
  it("uses first and last word", () => {
    expect(initialsOf("Oskar Lund")).toBe("OL");
    expect(initialsOf("Madonna")).toBe("M");
    expect(initialsOf(null)).toBe("?");
  });
});

describe("stampDate", () => {
  it("formats dd.MM", () => {
    expect(stampDate("2026-10-05T10:00:00")).toBe("05.10");
  });
});
