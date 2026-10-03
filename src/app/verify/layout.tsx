"use client";

import PublicShell from "@/components/shell/PublicShell";

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
