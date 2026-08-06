export interface NavItem {
  href: string;
  label: string;
  adminOnly: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", adminOnly: false },
  { href: "/tasks", label: "Tasks", adminOnly: true },
  { href: "/history", label: "History", adminOnly: true },
  { href: "/companies", label: "Companies", adminOnly: true },
  { href: "/teams", label: "Teams & members", adminOnly: true },
  { href: "/calendar", label: "Office calendar", adminOnly: false },
];
