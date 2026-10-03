"use client";

import AppShell from "@/components/shell/AppShell";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell allowedRoles={["operator", "super-admin"]}>{children}</AppShell>;
}
