/**
 * ADMIN LAYOUT (admin/layout.tsx)
 * ------------------------------
 * Functionality: The sidebar and navigation shell for all Admin pages.
 * Connection: Wraps all pages in the /admin subfolder with security checks.
 */
export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
