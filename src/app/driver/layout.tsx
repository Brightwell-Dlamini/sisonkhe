"use client";

import AppShell from "@/components/shell/AppShell";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell allowedRoles={["driver"]}>{children}</AppShell>;
}
