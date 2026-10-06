/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 — Invariant observation page.
 *
 * Route: /super/invariants
 * Access: super-admin only (enforced by middleware + the API route).
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadLatestReport } from "@/lib/invariants/runner";
import { InvariantsPanel } from "@/components/super/InvariantsPanel";

export const dynamic = "force-dynamic";

export default async function InvariantsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!staff || staff.role !== "super-admin" || staff.is_active !== true) {
    redirect("/admin");
  }

  const report = await loadLatestReport();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Invariants</h1>
        <p className="text-sm text-muted-foreground">
          Nightly reconciliation report. Read-only. Phase 0 observes; it never
          fixes.
        </p>
      </header>

      <InvariantsPanel initial={report} />
    </div>
  );
}
