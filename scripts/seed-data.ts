import type { DeadlineRule, Recurrence } from "../src/lib/tasks/recurrence-types";

export interface SeedPerson {
  email: string;
  fullName: string;
  role: "master_admin" | "admin" | "member";
  team: string | null;
  position: string;
}

/**
 * Ten people total, including the two fixed-credential demo accounts
 * (Mia is DEMO_ADMIN, Oskar is DEMO_MEMBER — chosen because his
 * dashboard ends up genuinely busy: an overdue item, a covering chip,
 * and a request of his own, so "Explore as Member" lands somewhere
 * interesting rather than an empty view). Ingrid/Freya/Sigrid carry
 * the three addendum §15.5 absence fixtures.
 */
export const PEOPLE: SeedPerson[] = [
  { email: "admin@taskdeck.local", fullName: "Mia Solvang", role: "master_admin", team: "A/R", position: "Finance Director" },
  { email: "member@taskdeck.local", fullName: "Oskar Lund", role: "member", team: "A/R", position: "AR Accountant" },
  { email: "ingrid@taskdeck.local", fullName: "Ingrid Berg", role: "member", team: "A/R", position: "AR Accountant" },
  { email: "nora@taskdeck.local", fullName: "Nora Eide", role: "member", team: "A/P", position: "AP Accountant" },
  { email: "kasper@taskdeck.local", fullName: "Kasper Dahl", role: "member", team: "A/P", position: "AP Accountant" },
  { email: "freya@taskdeck.local", fullName: "Freya Nystrøm", role: "member", team: "R2R 1", position: "Accountant" },
  { email: "elias@taskdeck.local", fullName: "Elias Moe", role: "member", team: "R2R 1", position: "Accountant" },
  { email: "sigrid@taskdeck.local", fullName: "Sigrid Aas", role: "member", team: "R2R 2", position: "Senior Accountant" },
  { email: "theo@taskdeck.local", fullName: "Theo Halvorsen", role: "member", team: "R2R 2", position: "Accountant" },
  { email: "vilde@taskdeck.local", fullName: "Vilde Strand", role: "member", team: null, position: "Financial Analyst" },
];

export const TEAMS = ["A/R", "A/P", "R2R 1", "R2R 2"];

export const DIMENSIONS: { name: string; values: string[] }[] = [
  { name: "Country", values: ["Norway", "Sweden", "Denmark"] },
  { name: "Brand", values: ["Comfort", "Clarion"] },
  { name: "Size", values: ["Small", "Medium", "Large"] },
];

export interface SeedCompany {
  name: string;
  country: string;
  brand: string;
  size: string;
}

const NO_NAMES = ["Fjordvik AS", "Nordlys Handel AS", "Bergtun Logistikk AS", "Trondheim Sørvis AS"];
const SE_NAMES = ["Skogby Konsult AB", "Nordkust Handel AB", "Västerås Logistik AB", "Solros Gruppen AB"];
const DK_NAMES = ["Havnegade ApS", "Vesterled Handel ApS", "Bakkely Logistik ApS", "Odense Nord ApS"];

const BRANDS = ["Comfort", "Clarion"];
const SIZES = ["Small", "Medium", "Large"];

function companiesFor(names: string[], country: string): SeedCompany[] {
  return names.map((name, i) => ({
    name,
    country,
    brand: BRANDS[i % BRANDS.length],
    size: SIZES[i % SIZES.length],
  }));
}

export const COMPANIES: SeedCompany[] = [
  ...companiesFor(NO_NAMES, "Norway"),
  ...companiesFor(SE_NAMES, "Sweden"),
  ...companiesFor(DK_NAMES, "Denmark"),
];

export type SeedAssignee = { type: "team"; team: string } | { type: "person"; email: string };
export type SeedScope = { dimension: string; value: string } | null;

export interface SeedTask {
  title: string;
  description?: string;
  assignee: SeedAssignee;
  scope: SeedScope[];
  recurrence: Recurrence;
  deadlineRule: DeadlineRule;
}

const NO = "NO";

export const TASKS: SeedTask[] = [
  { title: "Reconcile bank accounts", assignee: { type: "team", team: "A/R" }, scope: [], recurrence: { type: "weekly", weekday: 1 }, deadlineRule: null },
  { title: "Approve supplier invoices", assignee: { type: "team", team: "A/P" }, scope: [], recurrence: { type: "weekly", weekday: 3 }, deadlineRule: null },
  { title: "Update monthly report", assignee: { type: "person", email: "admin@taskdeck.local" }, scope: [], recurrence: { type: "monthly_fixed", dayOfMonth: 5 }, deadlineRule: null },
  { title: "Close month-end journal", assignee: { type: "team", team: "R2R 1" }, scope: [], recurrence: { type: "monthly_nth_working_day", n: -1, countryCode: NO }, deadlineRule: null },
  { title: "VAT return review", assignee: { type: "team", team: "R2R 2" }, scope: [{ dimension: "Country", value: "Norway" }], recurrence: { type: "monthly_nth_working_day", n: 5, countryCode: NO }, deadlineRule: null },
  { title: "Payroll review", assignee: { type: "person", email: "nora@taskdeck.local" }, scope: [], recurrence: { type: "monthly_fixed", dayOfMonth: 25 }, deadlineRule: null },
  { title: "Bank reconciliation — Sweden", assignee: { type: "team", team: "A/R" }, scope: [{ dimension: "Country", value: "Sweden" }], recurrence: { type: "weekly", weekday: 5 }, deadlineRule: null },
  { title: "Customer statements", assignee: { type: "person", email: "member@taskdeck.local" }, scope: [], recurrence: { type: "weekly", weekday: 2 }, deadlineRule: null },
  { title: "Credit control follow-up", assignee: { type: "team", team: "A/R" }, scope: [], recurrence: { type: "weekly", weekday: 4 }, deadlineRule: null },
  { title: "Vendor onboarding check", assignee: { type: "team", team: "A/P" }, scope: [], recurrence: { type: "monthly_fixed", dayOfMonth: 1 }, deadlineRule: null },
  { title: "Expense report audit", assignee: { type: "person", email: "kasper@taskdeck.local" }, scope: [], recurrence: { type: "weekly", weekday: 1 }, deadlineRule: null },
  { title: "Intercompany reconciliation", assignee: { type: "team", team: "R2R 1" }, scope: [{ dimension: "Brand", value: "Comfort" }], recurrence: { type: "monthly_nth_working_day", n: 3, countryCode: NO }, deadlineRule: null },
  { title: "Fixed asset register update", assignee: { type: "team", team: "R2R 2" }, scope: [], recurrence: { type: "monthly_fixed", dayOfMonth: 15 }, deadlineRule: null },
  { title: "Cash flow forecast", assignee: { type: "person", email: "ingrid@taskdeck.local" }, scope: [], recurrence: { type: "weekly", weekday: 3 }, deadlineRule: null },
  { title: "Denmark VAT filing", assignee: { type: "team", team: "R2R 2" }, scope: [{ dimension: "Country", value: "Denmark" }], recurrence: { type: "monthly_nth_working_day", n: -1, countryCode: "DK" }, deadlineRule: null },
  { title: "Petty cash count", assignee: { type: "person", email: "sigrid@taskdeck.local" }, scope: [], recurrence: { type: "weekly", weekday: 5 }, deadlineRule: null },
  { title: "Supplier statement reconciliation", assignee: { type: "team", team: "A/P" }, scope: [], recurrence: { type: "monthly_fixed", dayOfMonth: 10 }, deadlineRule: null },
  { title: "Bank fee review", assignee: { type: "team", team: "A/R" }, scope: [{ dimension: "Size", value: "Small" }], recurrence: { type: "weekly", weekday: 2 }, deadlineRule: null },
  { title: "New company setup checklist", assignee: { type: "person", email: "theo@taskdeck.local" }, scope: [], recurrence: { type: "monthly_fixed", dayOfMonth: 1 }, deadlineRule: null },
  { title: "Aged receivables review", assignee: { type: "team", team: "A/R" }, scope: [{ dimension: "Country", value: "Norway" }], recurrence: { type: "weekly", weekday: 1 }, deadlineRule: null },
  { title: "Aged payables review", assignee: { type: "team", team: "A/P" }, scope: [{ dimension: "Country", value: "Sweden" }], recurrence: { type: "weekly", weekday: 1 }, deadlineRule: null },
  { title: "Statutory accounts prep", assignee: { type: "team", team: "R2R 1" }, scope: [], recurrence: { type: "monthly_nth_working_day", n: 10, countryCode: NO }, deadlineRule: null },
  { title: "Board pack numbers", assignee: { type: "person", email: "elias@taskdeck.local" }, scope: [], recurrence: { type: "monthly_fixed", dayOfMonth: 20 }, deadlineRule: null },
  { title: "Sales tax reconciliation", assignee: { type: "team", team: "R2R 2" }, scope: [{ dimension: "Country", value: "Denmark" }], recurrence: { type: "weekly", weekday: 4 }, deadlineRule: null },
];
