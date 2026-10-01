/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reference data only. Everything else is created through the admin UI.
 */

import { EswatiniRegion, Route, RegionConfig } from "../types";

export const INITIAL_ROUTES: Route[] = [
  { id: "h_mb_mz", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Manzini", distanceKm: 42, baseFareE: 55, isPopular: true, startTime: "05:00" },
  { id: "h_mb_pp", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Piggs Peak", distanceKm: 68, baseFareE: 75, startTime: "05:30" },
  { id: "h_mb_lb", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Lobamba", distanceKm: 18, baseFareE: 25, isPopular: true, startTime: "05:00" },
  { id: "h_mb_mk", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Malkerns", distanceKm: 28, baseFareE: 40, startTime: "05:15" },
  { id: "h_mb_bu", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Bulembu", distanceKm: 88, baseFareE: 105, startTime: "06:00" },
  { id: "m_mz_mb", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Mbabane", distanceKm: 42, baseFareE: 55, isPopular: true, startTime: "05:00" },
  { id: "m_mz_mt", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Matsapha", distanceKm: 12, baseFareE: 20, isPopular: true, startTime: "05:00" },
  { id: "m_mz_st", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Siteki", distanceKm: 72, baseFareE: 80, startTime: "05:45" },
  { id: "m_mz_my", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Mankayane", distanceKm: 58, baseFareE: 65, startTime: "06:00" },
  { id: "m_mz_bh", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Bhunya", distanceKm: 48, baseFareE: 55, startTime: "05:30" },
  { id: "l_st_mz", region: EswatiniRegion.Lubombo, origin: "Siteki", destination: "Manzini", distanceKm: 72, baseFareE: 80, isPopular: true, startTime: "05:30" },
  { id: "l_st_bb", region: EswatiniRegion.Lubombo, origin: "Siteki", destination: "Big Bend", distanceKm: 64, baseFareE: 75, startTime: "06:00" },
  { id: "l_st_lh", region: EswatiniRegion.Lubombo, origin: "Siteki", destination: "Lomahasha", distanceKm: 52, baseFareE: 60, startTime: "05:45" },
  { id: "s_nh_mz", region: EswatiniRegion.Shiselweni, origin: "Nhlangano", destination: "Manzini", distanceKm: 118, baseFareE: 125, isPopular: true, startTime: "05:00" },
  { id: "s_nh_hl", region: EswatiniRegion.Shiselweni, origin: "Nhlangano", destination: "Hlathikhulu", distanceKm: 28, baseFareE: 35, startTime: "05:30" },
  { id: "s_nh_lv", region: EswatiniRegion.Shiselweni, origin: "Nhlangano", destination: "Lavumisa", distanceKm: 102, baseFareE: 110, startTime: "05:45" }
];

export const INITIAL_REGION_CONFIGS: RegionConfig[] = [
  { region: EswatiniRegion.Hhohho, terminalName: "Mbabane Main Rank Plaza", emergencyNumber: "+268 2404 2221", announcement: "ANNOUNCEMENT: Mbabane-Manzini Express loading on Bay 1." },
  { region: EswatiniRegion.Manzini, terminalName: "Manzini Hub Satellite Terminal", emergencyNumber: "+268 2505 4444", announcement: "ANNOUNCEMENT: Matsapha commuters board on Bay 2." },
  { region: EswatiniRegion.Lubombo, terminalName: "Siteki Gate Interchange", emergencyNumber: "+268 2343 5555", announcement: "ANNOUNCEMENT: Siteki-Maninzi corridor loading on Bay 1." },
  { region: EswatiniRegion.Shiselweni, terminalName: "Nhlangano Central Terminal", emergencyNumber: "+268 2207 8888", announcement: "ANNOUNCEMENT: Nhlangano express loading on Dock 1." },
];
