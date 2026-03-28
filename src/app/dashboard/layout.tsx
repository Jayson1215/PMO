export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
