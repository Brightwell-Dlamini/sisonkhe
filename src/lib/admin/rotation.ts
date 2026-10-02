/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface RotationDay {
  dayNumber: number;
  date: string;
  dayOfWeekShort: string;
  isToday: boolean;
  leadVehicleReg: string | null;
  queue: Array<{
    position: number;
    registrationNumber: string;
    vic: string | null;
    driverName: string | null;
    isMidMonth: boolean;
  }>;
}

export interface RotationView {
  routeId: string;
  routeOrigin: string;
  routeDestination: string;
  region: string;
  month: string;
  monthName: string;
  totalDays: number;
  cycleEndDate: string;
  dailyRoster: RotationDay[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function getRotationView(
  routeId: string,
  monthStr?: string
): Promise<RotationView | null> {
  const admin = createSupabaseAdminClient();

  const { data: route } = await admin
    .from("routes")
    .select("id, origin, destination, region_code")
    .eq("id", routeId)
    .maybeSingle();

  if (!route) return null;

  const { data: vehicles } = await admin
    .from("vehicles")
    .select(
      "registration_number, vic, driver_id, current_queue_position, is_mid_month_addition"
    )
    .eq("route_assignment_id", routeId)
    .neq("status", "Offline")
    .order("current_queue_position", { ascending: true });

  const list = vehicles ?? [];
  const driverIds = list
    .map((v) => v.driver_id as string | null)
    .filter((id): id is string => !!id);

  const driverMap = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from("drivers")
      .select("id, full_name")
      .in("id", driverIds);
    for (const d of drivers ?? []) driverMap.set(d.id as string, d.full_name as string);
  }

  const now = new Date();
  const parts = (monthStr ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-");
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = `${MONTH_NAMES[monthIndex]} ${year}`;
  const cycleEndDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;

  const regulars = list.filter((v) => !v.is_mid_month_addition);
  const midMonth = list.filter((v) => v.is_mid_month_addition);

  const dailyRoster: RotationDay[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, monthIndex, day);
    const jsDay = dateObj.getDay();
    const weekdayIdx = (jsDay + 6) % 7;
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday =
      now.getFullYear() === year &&
      now.getMonth() === monthIndex &&
      now.getDate() === day;

    const shift = regulars.length > 0 ? (day - 1) % regulars.length : 0;
    const rotated = regulars.length > 0
      ? [...regulars.slice(shift), ...regulars.slice(0, shift)]
      : [];

    const queue = rotated.map((v, idx) => {
      const driverId = v.driver_id as string | null;
      return {
        position: idx + 1,
        registrationNumber: v.registration_number as string,
        vic: (v.vic as string | null) ?? null,
        driverName: driverId ? driverMap.get(driverId) ?? null : null,
        isMidMonth: false,
      };
    });

    midMonth.forEach((v, idx) => {
      const driverId = v.driver_id as string | null;
      queue.push({
        position: rotated.length + idx + 1,
        registrationNumber: v.registration_number as string,
        vic: (v.vic as string | null) ?? null,
        driverName: driverId ? driverMap.get(driverId) ?? null : null,
        isMidMonth: true,
      });
    });

    dailyRoster.push({
      dayNumber: day,
      date: dateStr,
      dayOfWeekShort: DAYS_SHORT[weekdayIdx],
      isToday,
      leadVehicleReg: rotated[0]?.registration_number ?? null,
      queue,
    });
  }

  return {
    routeId: route.id as string,
    routeOrigin: route.origin as string,
    routeDestination: route.destination as string,
    region: route.region_code as string,
    month: monthStr ?? `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    monthName,
    totalDays,
    cycleEndDate,
    dailyRoster,
  };
}
