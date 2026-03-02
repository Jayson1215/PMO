import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const dynamic = 'force-dynamic';

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
