"use client";

import AppShell from "@/components/shell/AppShell";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
