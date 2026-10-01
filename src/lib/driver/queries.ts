/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver-scoped queries. Everything resolves to the driver's own data.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface DriverVehicle {
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
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiryDate: string | null;
}

export interface DriverSummary {
  tripsToday: number;
  tripsWeek: number;
  tripsMonth: number;
  passengersToday: number;
  passengersWeek: number;
  passengersMonth: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
}

export interface DriverTrip {
  id: string;
  date: string;
  departureTime: string;
  arrivalTime: string | null;
  routeOrigin: string | null;
  routeDestination: string | null;
  passengerCount: number;
  revenueSzl: number;
  status: string;
}

export interface DriverContext {
  driverId: string;
  fullName: string;
  phone: string;
  vehicle: DriverVehicle | null;
  marshal: {
    id: string;
    fullName: string;
    phone: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export async function getDriverContext(
  authUserId: string
): Promise<DriverContext | null> {
  const admin = createSupabaseAdminClient();

  const { data: driver, error } = await admin
    .from("drivers")
    .select(
      "id, full_name, phone, assigned_vehicle_reg, status"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !driver) return null;

  const driverId = driver.id as string;
  const vehicleReg = (driver.assigned_vehicle_reg as string | null) ?? null;

  let vehicle: DriverVehicle | null = null;
  let marshal: DriverContext["marshal"] = null;

  if (vehicleReg) {
    const { data: v } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, make, model, seating_capacity, classification, status, current_queue_position, loading_bay, route_assignment_id, permit_number, permit_status, permit_expiry_date"
      )
      .eq("registration_number", vehicleReg)
      .maybeSingle();

    if (v) {
      let routeOrigin: string | null = null;
      let routeDestination: string | null = null;
      let routeId: string | null = null;

      if (v.route_assignment_id) {
        routeId = v.route_assignment_id as string;
        const { data: route } = await admin
          .from("routes")
          .select("origin, destination")
          .eq("id", routeId)
          .maybeSingle();
        if (route) {
          routeOrigin = route.origin as string;
          routeDestination = route.destination as string;
        }

        // Find the marshal assigned to that route
        const { data: m } = await admin
          .from("marshals")
          .select("id, first_name, surname, phone, cell_no")
          .eq("assigned_route_id", routeId)
          .eq("is_active", true)
          .maybeSingle();

        if (m) {
          marshal = {
            id: m.id as string,
            fullName: `${m.first_name} ${m.surname}`.trim(),
            phone: ((m.phone ?? m.cell_no) as string | null) ?? null,
          };
        }
      }

      vehicle = {
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
        routeOrigin,
        routeDestination,
        permitNumber: (v.permit_number as string | null) ?? null,
        permitStatus: (v.permit_status as string | null) ?? null,
        permitExpiryDate: (v.permit_expiry_date as string | null) ?? null,
      };
    }
  }

  return {
    driverId,
    fullName: driver.full_name as string,
    phone: driver.phone as string,
    vehicle,
    marshal,
  };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

export async function getDriverSummary(
  driverId: string
): Promise<DriverSummary> {
  const admin = createSupabaseAdminClient();
  const today = dateStr(new Date());
  const weekStart = daysAgo(6);
  const monthStart = daysAgo(29);

  const { data: trips } = await admin
    .from("trips")
    .select("date, passenger_count, revenue_szl, status")
    .eq("driver_id", driverId)
    .gte("date", monthStart)
    .lte("date", today);

  const list = trips ?? [];

  const sum = (arr: typeof list) =>
    arr.reduce(
      (acc, t) => {
        acc.passengers += Number(t.passenger_count ?? 0);
        acc.revenue += Number(t.revenue_szl ?? 0);
        acc.count += 1;
        return acc;
      },
      { count: 0, passengers: 0, revenue: 0 }
    );

  const todayList = list.filter((t) => t.date === today);
  const weekList = list.filter((t) => (t.date as string) >= weekStart);
  const monthList = list;

  const sToday = sum(todayList);
  const sWeek = sum(weekList);
  const sMonth = sum(monthList);

  return {
    tripsToday: sToday.count,
    tripsWeek: sWeek.count,
    tripsMonth: sMonth.count,
    passengersToday: sToday.passengers,
    passengersWeek: sWeek.passengers,
    passengersMonth: sMonth.passengers,
    revenueToday: sToday.revenue,
    revenueWeek: sWeek.revenue,
    revenueMonth: sMonth.revenue,
  };
}

// ---------------------------------------------------------------------------
// Recent trips
// ---------------------------------------------------------------------------

export async function getDriverRecentTrips(
  driverId: string,
  limit: number = 20
): Promise<DriverTrip[]> {
  const admin = createSupabaseAdminClient();

  const { data: trips, error } = await admin
    .from("trips")
    .select(
      "id, date, departure_time, arrival_time, route_id, passenger_count, revenue_szl, status"
    )
    .eq("driver_id", driverId)
    .order("date", { ascending: false })
    .order("departure_time", { ascending: false })
    .limit(limit);

  if (error || !trips) return [];

  const routeIds = Array.from(
    new Set(trips.map((t) => t.route_id as string))
  );

  const routeMap = new Map<string, { origin: string; destination: string }>();
  if (routeIds.length > 0) {
    const { data: routes } = await admin
      .from("routes")
      .select("id, origin, destination")
      .in("id", routeIds);
    for (const r of routes ?? []) {
      routeMap.set(r.id as string, {
        origin: r.origin as string,
        destination: r.destination as string,
      });
    }
  }

  return trips.map((t) => {
    const route = routeMap.get(t.route_id as string);
    return {
      id: t.id as string,
      date: t.date as string,
      departureTime: t.departure_time as string,
      arrivalTime: (t.arrival_time as string | null) ?? null,
      routeOrigin: route?.origin ?? null,
      routeDestination: route?.destination ?? null,
      passengerCount: (t.passenger_count as number) ?? 0,
      revenueSzl: Number(t.revenue_szl ?? 0),
      status: t.status as string,
    };
  });
}
