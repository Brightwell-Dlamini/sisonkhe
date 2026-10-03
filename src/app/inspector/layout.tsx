"use client";

import AppShell from "@/components/shell/AppShell";

export default function InspectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell allowedRoles={["inspector", "super-admin"]}>{children}</AppShell>;
}
