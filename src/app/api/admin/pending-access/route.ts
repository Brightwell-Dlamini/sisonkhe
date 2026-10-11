/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET — drivers + marshals enrolled but without login (pending Send Access).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin", "admin", "fleet-manager"]);
  const admin = createSupabaseAdminClient();

  const [{ data: drivers }, { data: marshals }] = await Promise.all([
    admin
      .from("drivers")
      .select("id, full_name, phone, national_id, status, created_at")
      .is("auth_user_id", null)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("marshals")
      .select(
        "id, first_name, surname, cell_no, phone, id_number, created_at, is_active"
      )
      .is("auth_user_id", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const pendingDrivers = (drivers ?? []).map((d) => ({
    kind: "driver" as const,
    id: d.id,
    fullName: d.full_name as string,
    phone: (d.phone as string) ?? null,
    nationalId: (d.national_id as string) ?? null,
    status: d.status as string | null,
    createdAt: d.created_at as string | null,
  }));

  const pendingMarshals = (marshals ?? []).map((m) => ({
    kind: "marshal" as const,
    id: m.id,
    fullName: `${m.first_name ?? ""} ${m.surname ?? ""}`.trim() || "Marshal",
    phone: ((m.cell_no as string) || (m.phone as string)) ?? null,
    nationalId: (m.id_number as string) ?? null,
    status: m.is_active === false ? "Inactive" : "Active",
    createdAt: m.created_at as string | null,
  }));

  const items = [...pendingDrivers, ...pendingMarshals].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return ok({
    items,
    counts: {
      drivers: pendingDrivers.length,
      marshals: pendingMarshals.length,
      total: items.length,
    },
  });
});
