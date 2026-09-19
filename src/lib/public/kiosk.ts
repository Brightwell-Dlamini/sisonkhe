/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Curated queries for the public kiosk.
 *
 * Runs with the admin client but returns ONLY whitelisted, non-PII fields.
 * This is the single place where we decide what the public can see.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

// ---------------------------------------------------------------------------
// Public shapes (the contract we expose to the internet)
// ---------------------------------------------------------------------------

export interface PublicRoute {
  id: string;
  origin: string;
  destination: string;
  region: string;
  baseFareE: number;
  distanceKm: number;
  isPopular: boolean;
  startTime: string | null;
}

export interface PublicVehicle {
  registrationNumber: string;
  vic: string | null;
  make: string;
  model: string;
  seatingCapacity: number;
  classification: string;
  status: string;
  currentQueuePosition: number;
  loadingBay: string | null;
  routeId: string | null;
  routeOrigin: string | null;
  routeDestination: string | null;
  /** Only first name + initial of surname. No full name, no phone, no ID. */
  driverDisplayName: string | null;
}

export interface PublicAdvert {
  id: string;
  title: string;
  sponsorName: string;
  imageUrl: string;
  targetRegions: string[];
  promoCode: string | null;
  description: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  category: string | null;
}

export interface PublicRegionConfig {
  region: string;
  terminalName: string;
  emergencyNumber: string | null;
  announcement: string | null;
}

export interface KioskSnapshot {
  region: string;
  regions: string[];
  routes: PublicRoute[];
  vehicles: PublicVehicle[];
  adverts: PublicAdvert[];
  regionConfig: PublicRegionConfig | null;
  serverTime: string;
}

// ---------------------------------------------------------------------------
// Region resolution
// ---------------------------------------------------------------------------

export async function listPublicRegions(): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("regions")
    .select("code")
    .order("code", { ascending: true });

  if (error) {
    console.error("[public/kiosk] regions error:", error);
    return [];
  }
  return (data ?? []).map((r) => r.code as string);
}

// ---------------------------------------------------------------------------
// Route discovery
// ---------------------------------------------------------------------------

export async function listPublicRoutes(region?: string): Promise<PublicRoute[]> {
  const admin = createSupabaseAdminClient();
  let q = admin
    .from("routes")
    .select(
      "id, origin, destination, region_code, base_fare_e, distance_km, is_popular, start_time"
    );

  if (region) q = q.eq("region_code", region);

  const { data, error } = await q.order("origin", { ascending: true });

  if (error) {
    console.error("[public/kiosk] routes error:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    origin: r.origin as string,
    destination: r.destination as string,
    region: r.region_code as string,
    baseFareE: Number(r.base_fare_e ?? 0),
    distanceKm: Number(r.distance_km ?? 0),
    isPopular: Boolean(r.is_popular),
    startTime: (r.start_time as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Vehicles with curated fields
// ---------------------------------------------------------------------------

/**
 * Display name: first name + surname initial.
 * e.g. "Sibusiso Dlamini" -> "Sibusiso D."
 */
function buildDisplayName(fullName: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${first} ${lastInitial}.`;
}

export async function listPublicVehicles(
  region: string
): Promise<PublicVehicle[]> {
  const admin = createSupabaseAdminClient();

  // 1. Routes in this region
  const { data: routes } = await admin
    .from("routes")
    .select("id, origin, destination")
    .eq("region_code", region);

  const routeIds = (routes ?? []).map((r) => r.id as string);
  if (routeIds.length === 0) return [];

  const routeMap = new Map<string, { origin: string; destination: string }>();
  for (const r of routes ?? []) {
    routeMap.set(r.id as string, {
      origin: r.origin as string,
      destination: r.destination as string,
    });
  }

  // 2. Vehicles on those routes (exclude Offline)
  const { data: vehicles, error } = await admin
    .from("vehicles")
    .select(
      "registration_number, vic, make, model, seating_capacity, classification, status, current_queue_position, loading_bay, route_assignment_id, driver_id"
    )
    .in("route_assignment_id", routeIds)
    .neq("status", "Offline")
    .order("current_queue_position", { ascending: true })
    .order("registration_number", { ascending: true });

  if (error) {
    console.error("[public/kiosk] vehicles error:", error);
    return [];
  }

  const vehicleList = vehicles ?? [];

  // 3. Driver display names (first name + initial only)
  const driverIds = vehicleList
    .map((v) => v.driver_id as string | null)
    .filter((id): id is string => !!id);

  const driverDisplayMap = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from("drivers")
      .select("id, full_name")
      .in("id", driverIds);
    for (const d of drivers ?? []) {
      const display = buildDisplayName(d.full_name as string | null);
      if (display) driverDisplayMap.set(d.id as string, display);
    }
  }

  return vehicleList.map((v) => {
    const routeId = v.route_assignment_id as string | null;
    const route = routeId ? routeMap.get(routeId) : null;
    const driverId = v.driver_id as string | null;

    return {
      registrationNumber: v.registration_number as string,
      vic: (v.vic as string | null) ?? null,
      make: v.make as string,
      model: v.model as string,
      seatingCapacity: v.seating_capacity as number,
      classification: v.classification as string,
      status: v.status as string,
      currentQueuePosition: (v.current_queue_position as number) ?? 0,
      loadingBay: (v.loading_bay as string | null) ?? null,
      routeId,
      routeOrigin: route?.origin ?? null,
      routeDestination: route?.destination ?? null,
      driverDisplayName: driverId
        ? driverDisplayMap.get(driverId) ?? null
        : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Active adverts for a region
// ---------------------------------------------------------------------------

export async function listPublicAdverts(
  region: string
): Promise<PublicAdvert[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("adverts")
    .select(
      "id, title, sponsor_name, image_url, target_regions, promo_code, description, contact_phone, website_url, category"
    )
    .eq("is_active", true);

  if (error) {
    console.error("[public/kiosk] adverts error:", error);
    return [];
  }

  // Filter by region in memory (target_regions is text[])
  const filtered = (data ?? []).filter((ad) => {
    const targets = (ad.target_regions as string[] | null) ?? [];
    if (targets.length === 0) return true;
    if (targets.includes("All")) return true;
    return targets.includes(region);
  });

  return filtered.map((ad) => ({
    id: ad.id as string,
    title: ad.title as string,
    sponsorName: ad.sponsor_name as string,
    imageUrl: ad.image_url as string,
    targetRegions: (ad.target_regions as string[] | null) ?? [],
    promoCode: (ad.promo_code as string | null) ?? null,
    description: (ad.description as string | null) ?? null,
    contactPhone: (ad.contact_phone as string | null) ?? null,
    websiteUrl: (ad.website_url as string | null) ?? null,
    category: (ad.category as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Region config (terminal name, announcement)
// ---------------------------------------------------------------------------

export async function getPublicRegionConfig(
  region: string
): Promise<PublicRegionConfig | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("regions")
    .select("code, terminal_name, emergency_number, announcement")
    .eq("code", region)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[public/kiosk] region config error:", error);
    return null;
  }

  return {
    region: data.code as string,
    terminalName: data.terminal_name as string,
    emergencyNumber: (data.emergency_number as string | null) ?? null,
    announcement: (data.announcement as string | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// One-shot snapshot — the whole kiosk data in one call
// ---------------------------------------------------------------------------

export async function getKioskSnapshot(
  region?: string
): Promise<KioskSnapshot> {
  const regions = await listPublicRegions();
  const effectiveRegion =
    region && regions.includes(region)
      ? region
      : regions[0] ?? "Hhohho";

  const [routes, vehicles, adverts, regionConfig] = await Promise.all([
    listPublicRoutes(effectiveRegion),
    listPublicVehicles(effectiveRegion),
    listPublicAdverts(effectiveRegion),
    getPublicRegionConfig(effectiveRegion),
  ]);

  return {
    region: effectiveRegion,
    regions,
    routes,
    vehicles,
    adverts,
    regionConfig,
    serverTime: new Date().toISOString(),
  };
}
