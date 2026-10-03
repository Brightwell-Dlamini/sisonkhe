"use client";

import AppShell from "@/components/shell/AppShell";

export default function MarshalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell allowedRoles={["marshal"]}>{children}</AppShell>;
}
