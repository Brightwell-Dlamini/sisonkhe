/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver-facing roster computation. Same math as marshal roster, scoped
 * to a single driver's vehicle.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface DriverRosterDay {
  dayNumber: number;
  date: string;
  dayOfWeek: string;
  dayOfWeekShort: string;
  isToday: boolean;
  isTomorrow: boolean;
  myPosition: number | null;
  myIsLead: boolean;
  myMetadata: string;
  leadVehicleReg: string | null;
}

export interface DriverRoster {
  vehicleReg: string;
  routeId: string;
  routeOrigin: string;
  routeDestination: string;
  region: string;
  month: string;
  monthName: string;
  year: number;
  totalDays: number;
  cycleEndDate: string;
  /** True if we're past 8:30 PM local — the "effective" roster is tomorrow's */
  after830PM: boolean;
  effectiveRosterDay: number;
  dailyRoster: DriverRosterDay[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isAfter830PM(): boolean {
  const d = new Date();
  const hrs = d.getHours();
  const mins = d.getMinutes();
  return hrs > 20 || (hrs === 20 && mins >= 30);
}

export async function computeDriverRoster(
  vehicleReg: string,
  monthStr?: string
): Promise<DriverRoster | null> {
  const admin = createSupabaseAdminClient();
  const reg = vehicleReg.trim().toUpperCase();

  // Get vehicle + route
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("registration_number, route_assignment_id")
    .eq("registration_number", reg)
    .maybeSingle();

  if (!vehicle || !vehicle.route_assignment_id) return null;

  const { data: route } = await admin
    .from("routes")
    .select("id, origin, destination, region_code")
    .eq("id", vehicle.route_assignment_id as string)
    .maybeSingle();

  if (!route) return null;

  // Get all vehicles on route
  const { data: routeVehicles } = await admin
    .from("vehicles")
    .select("registration_number, current_queue_position, is_mid_month_addition")
    .eq("route_assignment_id", route.id as string)
    .neq("status", "Offline")
    .order("current_queue_position", { ascending: true });

  const list = routeVehicles ?? [];

  const now = new Date();
  const parts = (monthStr ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-");
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = `${MONTH_NAMES[monthIndex]} ${year}`;
  const cycleEndDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;

  const regulars = list.filter((v) => !v.is_mid_month_addition);
  const midMonth = list.filter((v) => v.is_mid_month_addition);

  const dailyRoster: DriverRosterDay[] = [];
  const after830 = isAfter830PM();

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, monthIndex, day);
    const jsDay = dateObj.getDay();
    const weekdayIdx = (jsDay + 6) % 7;
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday =
      now.getFullYear() === year &&
      now.getMonth() === monthIndex &&
      now.getDate() === day;

    const tomorrow = new Date(now.getTime() + 86400000);
    const isTomorrow =
      tomorrow.getFullYear() === year &&
      tomorrow.getMonth() === monthIndex &&
      tomorrow.getDate() === day;

    const shift = regulars.length > 0 ? (day - 1) % regulars.length : 0;
    const rotated =
      regulars.length > 0
        ? [...regulars.slice(shift), ...regulars.slice(0, shift)]
        : [];

    // Where is this driver's vehicle?
    let myPosition: number | null = null;
    let myIsLead = false;
    let myMetadata = "";

    rotated.forEach((v, idx) => {
      if (v.registration_number === reg) {
        myPosition = idx + 1;
        myIsLead = idx === 0;
        myMetadata = myIsLead
          ? day === 1
            ? `You are lead on Day 1 of ${monthName}`
            : `You are lead (advanced from #2 on Day ${day - 1})`
          : `You are at #${idx + 1} on Day ${day}`;
      }
    });

    // If it's a mid-month vehicle, position is at the tail
    if (myPosition === null) {
      const midIdx = midMonth.findIndex((v) => v.registration_number === reg);
      if (midIdx >= 0) {
        myPosition = rotated.length + midIdx + 1;
        myMetadata = `Mid-month addition, tail-locked for ${monthName}`;
      }
    }

    dailyRoster.push({
      dayNumber: day,
      date: dateStr,
      dayOfWeek: DAYS[weekdayIdx],
      dayOfWeekShort: DAYS_SHORT[weekdayIdx],
      isToday,
      isTomorrow,
      myPosition,
      myIsLead,
      myMetadata,
      leadVehicleReg: rotated[0]?.registration_number ?? null,
    });
  }

  const todayDay = now.getDate();
  const effectiveRosterDay = after830
    ? Math.min(todayDay + 1, totalDays)
    : todayDay;

  return {
    vehicleReg: reg,
    routeId: route.id as string,
    routeOrigin: route.origin as string,
    routeDestination: route.destination as string,
    region: route.region_code as string,
    month: monthStr ?? `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    monthName,
    year,
    totalDays,
    cycleEndDate,
    after830PM: after830,
    effectiveRosterDay,
    dailyRoster,
  };
}
