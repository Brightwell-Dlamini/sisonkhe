"use client";

import AppShell from "@/components/shell/AppShell";
import type { AuthRole } from "@/lib/auth/roles";

const ALLOWED: AuthRole[] = ["driver"];

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell allowedRoles={ALLOWED}>{children}</AppShell>;
}
