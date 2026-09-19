/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seed script for development and pilot data.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
 *
 * ⚠️ Uses the SERVICE ROLE KEY. Never run in production without review.
 * ⚠️ Idempotent: uses ON CONFLICT DO UPDATE for safe re-runs.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Seed data — mirrors mockData.ts. Update both together.
// ---------------------------------------------------------------------------

const DRIVERS = [
  {
    id: "drv_h1",
    full_name: "Sibusiso Dlamini",
    national_id: "9102144510882",
    phone: "+268 7604 1234",
    license_number: "SZ-DL-29381",
    license_class: "Heavy Duty / PDP",
    status: "Active",
    emergency_contact_name: "Thandeka Dlamini",
    emergency_contact_phone: "+268 7812 5555",
    assigned_vehicle_reg: "HSD 101 BM",
    avatar_seed: "sibusiso",
    pdp_number: "PDP-22010",
    pdp_issue_date: "2025-07-14",
    pdp_expiry_date: "2027-07-14",
    pdp_issuing_authority: "Eswatini Road Transport Dept",
    pdp_status: "Valid",
  },
  // ... (rest of drivers — copy from mockData.ts)
];

const VEHICLES = [
  {
    registration_number: "HSD 101 BM",
    vic: "HBM-101",
    make: "Toyota",
    model: "Quantum Ses'fikile",
    seating_capacity: 15,
    classification: "kombi",
    route_assignment_id: "h_mb_mz",
    loading_bay: "Bay 01",
    owner_name: "Cyril Kunene",
    owner_phone: "+268 7602 8899",
    driver_id: "drv_h1",
    status: "Loading",
    current_queue_position: 1,
    permit_number: "G1090/2026",
    permit_status: "Active",
    permit_issue_date: "2025-07-14",
    permit_expiry_date: "2027-07-14",
    cof_number: "COF-5020-SZ",
    cof_issue_date: "2025-07-14",
    cof_expiry_date: "2027-07-14",
    association: "Mbabane Transport Association",
  },
  // ... (rest from mockData.ts)
];

async function seed() {
  console.log("Starting seed...");

  // 1. Drivers
  console.log(`Upserting ${DRIVERS.length} drivers...`);
  const { error: driversError } = await supabase
    .from("drivers")
    .upsert(DRIVERS, { onConflict: "id" });
  if (driversError) {
    console.error("Drivers seed failed:", driversError);
    process.exit(1);
  }

  // 2. Vehicles
  console.log(`Upserting ${VEHICLES.length} vehicles...`);
  const { error: vehiclesError } = await supabase
    .from("vehicles")
    .upsert(VEHICLES, { onConflict: "registration_number" });
  if (vehiclesError) {
    console.error("Vehicles seed failed:", vehiclesError);
    process.exit(1);
  }

  // 3. Verify
  const { count: driverCount } = await supabase
    .from("drivers")
    .select("*", { count: "exact", head: true });
  const { count: vehicleCount } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true });

  console.log(`✓ Seeded ${driverCount} drivers, ${vehicleCount} vehicles`);
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
