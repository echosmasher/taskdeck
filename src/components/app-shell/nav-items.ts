import {
  Building2,
  Calendar,
  ClipboardList,
  History,
  Inbox,
  LayoutDashboard,
  Settings as SettingsIcon,
  ShieldCheck,
  Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  adminOnly: boolean;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", adminOnly: false, icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", adminOnly: true, icon: ClipboardList },
  { href: "/coverage", label: "Coverage", adminOnly: true, icon: ShieldCheck },
  { href: "/requests", label: "Requests", adminOnly: true, icon: Inbox },
  { href: "/history", label: "History", adminOnly: true, icon: History },
  { href: "/companies", label: "Companies", adminOnly: true, icon: Building2 },
  { href: "/teams", label: "Teams & members", adminOnly: true, icon: Users2 },
  { href: "/calendar", label: "Office calendar", adminOnly: false, icon: Calendar },
  { href: "/settings", label: "Settings", adminOnly: true, icon: SettingsIcon },
];
