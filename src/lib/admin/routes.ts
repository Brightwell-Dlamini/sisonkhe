/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { newEntityId } from "@/lib/domain/ids";

export interface RouteRow {
  id: string;
  region: string;
  origin: string;
  destination: string;
  distanceKm: number;
  baseFareE: number;
  isPopular: boolean;
  startTime: string | null;
  defaultBay: string | null;
}

function mapRoute(row: Record<string, unknown>): RouteRow {
  return {
    id: row.id as string,
    region: row.region_code as string,
    origin: row.origin as string,
    destination: row.destination as string,
    distanceKm: Number(row.distance_km ?? 0),
    baseFareE: Number(row.base_fare_e ?? 0),
    isPopular: Boolean(row.is_popular),
    startTime: (row.start_time as string | null) ?? null,
    defaultBay: (row.default_bay as string | null) ?? null,
  };
}

export async function listRoutes(
  regionScope: string | null = null
): Promise<RouteRow[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("routes")
    .select(
      "id, region_code, origin, destination, distance_km, base_fare_e, is_popular, start_time, default_bay"
    )
    .order("region_code", { ascending: true })
    .order("origin", { ascending: true });

  if (regionScope) {
    query = query.ilike("region_code", regionScope);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/routes] list error:", error);
    return [];
  }
  return (data ?? []).map(mapRoute);
}

export interface CreateRouteInput {
  origin: string;
  destination: string;
  region: string;
  distanceKm: number;
  baseFareE: number;
  isPopular?: boolean;
  startTime?: string;
  defaultBay?: string;
}

export async function createRoute(input: CreateRouteInput): Promise<{
  success: boolean;
  route?: RouteRow;
  error?: string;
}> {
  const admin = createSupabaseAdminClient();
  const id = newEntityId("route");

  const { data, error } = await admin
    .from("routes")
    .insert({
      id,
      origin: input.origin,
      destination: input.destination,
      region_code: input.region,
      distance_km: input.distanceKm,
      base_fare_e: input.baseFareE,
      is_popular: input.isPopular ?? false,
      start_time: input.startTime ?? "05:00",
      default_bay: input.defaultBay ?? "Bay 01",
    })
    .select(
      "id, region_code, origin, destination, distance_km, base_fare_e, is_popular, start_time, default_bay"
    )
    .single();

  if (error || !data) return { success: false, error: error?.message };
  return { success: true, route: mapRoute(data) };
}

export async function updateRoute(
  id: string,
  input: Partial<CreateRouteInput>
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.origin !== undefined) patch.origin = input.origin;
  if (input.destination !== undefined) patch.destination = input.destination;
  if (input.region !== undefined) patch.region_code = input.region;
  if (input.distanceKm !== undefined) patch.distance_km = input.distanceKm;
  if (input.baseFareE !== undefined) patch.base_fare_e = input.baseFareE;
  if (input.isPopular !== undefined) patch.is_popular = input.isPopular;
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.defaultBay !== undefined) patch.default_bay = input.defaultBay;

  const { error } = await admin.from("routes").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteRoute(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { data: vehicles } = await admin
    .from("vehicles")
    .select("registration_number")
    .eq("route_assignment_id", id)
    .limit(1);

  if (vehicles && vehicles.length > 0) {
    return {
      success: false,
      error: "Cannot delete: vehicles are assigned to this route.",
    };
  }

  const { error } = await admin.from("routes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
