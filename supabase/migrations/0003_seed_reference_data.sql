-- =============================================================================
-- Seed reference data: regions and routes.
-- =============================================================================
-- These are safe to seed via SQL because they're static reference data.
-- Vehicles, drivers, etc. are seeded via scripts/seed.ts (uses service role).
-- =============================================================================

BEGIN;

-- Regions
INSERT INTO public.regions (code, name, terminal_name, emergency_number, announcement)
VALUES
  ('Hhohho', 'Hhohho', 'Mbabane Main Rank Plaza', '+268 2404 2221',
   'ANNOUNCEMENT: Mbabane-Manzini Express commuters please board vehicle HSD 101 BM now loading on Bay 1. Safe travel!'),
  ('Manzini', 'Manzini', 'Manzini Hub Satellite Terminal', '+268 2505 4444',
   'ANNOUNCEMENT: Commuters to Matsapha Industrial Site can board the Kombi currently stationed on Bay 2.'),
  ('Lubombo', 'Lubombo', 'Siteki Gate Interchange', '+268 2343 5555',
   'ANNOUNCEMENT: Siteki to Manzini corridor Kombis are now boarding. Departures scheduled hourly on Bay 1.'),
  ('Shiselweni', 'Shiselweni', 'Nhlangano Central Terminal', '+268 2207 8888',
   'ANNOUNCEMENT: The Nhlangano express coach is currently loading passengers on Dock 1.')
ON CONFLICT (code) DO NOTHING;

-- Routes (matching mockData.INITIAL_ROUTES)
INSERT INTO public.routes (id, region_code, origin, destination, distance_km, base_fare_e, is_popular, start_time, default_bay)
VALUES
  ('h_mb_mz', 'Hhohho', 'Mbabane', 'Manzini', 42, 55, true, '05:00', 'Bay 01'),
  ('h_mb_pp', 'Hhohho', 'Mbabane', 'Piggs Peak', 68, 75, false, '05:30', 'Bay 02'),
  ('h_mb_lb', 'Hhohho', 'Mbabane', 'Lobamba', 18, 25, true, '05:00', 'Bay 03'),
  ('h_mb_mk', 'Hhohho', 'Mbabane', 'Malkerns', 28, 40, false, '05:15', 'Bay 04'),
  ('h_mb_bu', 'Hhohho', 'Mbabane', 'Bulembu', 88, 105, false, '06:00', 'Bay 05'),
  ('m_mz_mb', 'Manzini', 'Manzini', 'Mbabane', 42, 55, true, '05:00', 'Bay 01'),
  ('m_mz_mt', 'Manzini', 'Manzini', 'Matsapha', 12, 20, true, '05:00', 'Bay 02'),
  ('m_mz_st', 'Manzini', 'Manzini', 'Siteki', 72, 80, false, '05:45', 'Bay 03'),
  ('m_mz_my', 'Manzini', 'Manzini', 'Mankayane', 58, 65, false, '06:00', 'Bay 04'),
  ('m_mz_bh', 'Manzini', 'Manzini', 'Bhunya', 48, 55, false, '05:30', 'Bay 05'),
  ('l_st_mz', 'Lubombo', 'Siteki', 'Manzini', 72, 80, true, '05:30', 'Bay 01'),
  ('l_st_bb', 'Lubombo', 'Siteki', 'Big Bend', 64, 75, false, '06:00', 'Bay 02'),
  ('l_st_lh', 'Lubombo', 'Siteki', 'Lomahasha', 52, 60, false, '05:45', 'Bay 03'),
  ('s_nh_mz', 'Shiselweni', 'Nhlangano', 'Manzini', 118, 125, true, '05:00', 'Bay 01'),
  ('s_nh_hl', 'Shiselweni', 'Nhlangano', 'Hlathikhulu', 28, 35, false, '05:30', 'Bay 02'),
  ('s_nh_lv', 'Shiselweni', 'Nhlangano', 'Lavumisa', 102, 110, false, '05:45', 'Bay 03')
ON CONFLICT (id) DO NOTHING;

COMMIT;
