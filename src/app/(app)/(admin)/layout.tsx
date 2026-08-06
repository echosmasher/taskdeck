import type { ReactNode } from "react";
import { requireAdminProfile } from "@/lib/auth/require-profile";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminProfile();
  return children;
}
