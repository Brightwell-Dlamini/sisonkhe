/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EswatiniRegion, Route, Vehicle, Driver, Trip, RankNotification, KombiStatus, RegionConfig, IncidentReport, RankFeePayment, TrafficTicket, MarshalAccount, MarshalTransaction, Advert } from "../types";
import { generateVIC, getRouteCode, syncDriverWithVehicle } from "./helper";
import { pushServerState } from "./syncManager";

// Seed Routes across all 4 administrative regions of Eswatini
export const INITIAL_ROUTES: Route[] = [
  // Hhohho Region Routes
  { id: "h_mb_mz", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Manzini", distanceKm: 42, baseFareE: 55, isPopular: true, startTime: "05:00" },
  { id: "h_mb_pp", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Piggs Peak", distanceKm: 68, baseFareE: 75, startTime: "05:30" },
  { id: "h_mb_lb", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Lobamba", distanceKm: 18, baseFareE: 25, isPopular: true, startTime: "05:00" },
  { id: "h_mb_mk", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Malkerns", distanceKm: 28, baseFareE: 40, startTime: "05:15" },
  { id: "h_mb_bu", region: EswatiniRegion.Hhohho, origin: "Mbabane", destination: "Bulembu", distanceKm: 88, baseFareE: 105, startTime: "06:00" },

  // Manzini Region Routes
  { id: "m_mz_mb", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Mbabane", distanceKm: 42, baseFareE: 55, isPopular: true, startTime: "05:00" },
  { id: "m_mz_mt", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Matsapha", distanceKm: 12, baseFareE: 20, isPopular: true, startTime: "05:00" },
  { id: "m_mz_st", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Siteki", distanceKm: 72, baseFareE: 80, startTime: "05:45" },
  { id: "m_mz_my", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Mankayane", distanceKm: 58, baseFareE: 65, startTime: "06:00" },
  { id: "m_mz_bh", region: EswatiniRegion.Manzini, origin: "Manzini", destination: "Bhunya", distanceKm: 48, baseFareE: 55, startTime: "05:30" },

  // Lubombo Region Routes
  { id: "l_st_mz", region: EswatiniRegion.Lubombo, origin: "Siteki", destination: "Manzini", distanceKm: 72, baseFareE: 80, isPopular: true, startTime: "05:30" },
  { id: "l_st_bb", region: EswatiniRegion.Lubombo, origin: "Siteki", destination: "Big Bend", distanceKm: 64, baseFareE: 75, startTime: "06:00" },
  { id: "l_st_lh", region: EswatiniRegion.Lubombo, origin: "Siteki", destination: "Lomahasha", distanceKm: 52, baseFareE: 60, startTime: "05:45" },

  // Shiselweni Region Routes
  { id: "s_nh_mz", region: EswatiniRegion.Shiselweni, origin: "Nhlangano", destination: "Manzini", distanceKm: 118, baseFareE: 125, isPopular: true, startTime: "05:00" },
  { id: "s_nh_hl", region: EswatiniRegion.Shiselweni, origin: "Nhlangano", destination: "Hlathikhulu", distanceKm: 28, baseFareE: 35, startTime: "05:30" },
  { id: "s_nh_lv", region: EswatiniRegion.Shiselweni, origin: "Nhlangano", destination: "Lavumisa", distanceKm: 102, baseFareE: 110, startTime: "05:45" }
];

// Seed Drivers with professional credentials and status
export const INITIAL_DRIVERS: Driver[] = [
  // Hhohho Region Drivers
  {
    id: "drv_h1",
    fullName: "Sibusiso Dlamini",
    username: "sibusiso",
    password: "password123",
    nationalId: "9102144510882",
    phone: "+268 7604 1234",
    licenseNumber: "SZ-DL-29381",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Thandeka Dlamini",
    emergencyContactPhone: "+268 7812 5555",
    assignedVehicleReg: "HSD 101 BM",
    avatarSeed: "sibusiso",
    profilePictureUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_h2",
    fullName: "Gcina Masuku",
    username: "gcina",
    password: "password123",
    nationalId: "8706245120811",
    phone: "+268 7611 9876",
    licenseNumber: "SZ-DL-11925",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Sipho Masuku",
    emergencyContactPhone: "+268 7654 4433",
    assignedVehicleReg: "HSD 202 BM",
    avatarSeed: "gcina",
    profilePictureUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_h3",
    fullName: "Musa Nxumalo",
    username: "musa",
    password: "password123",
    nationalId: "9311145180881",
    phone: "+268 7622 3456",
    licenseNumber: "SZ-DL-41221",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Nomvula Nxumalo",
    emergencyContactPhone: "+268 7699 8765",
    assignedVehicleReg: "HSD 303 BM",
    avatarSeed: "musa",
    profilePictureUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_h4",
    fullName: "Thabo Simelane",
    username: "thabo",
    password: "password123",
    nationalId: "8901125200885",
    phone: "+268 7644 5678",
    licenseNumber: "SZ-DL-82931",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Zodwa Simelane",
    emergencyContactPhone: "+268 7688 1232",
    assignedVehicleReg: "HSD 404 BM",
    avatarSeed: "thabo",
    profilePictureUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_h5",
    fullName: "Mduduzi Shongwe",
    username: "mduduzi",
    password: "password123",
    nationalId: "9507195220819",
    phone: "+268 7655 4321",
    licenseNumber: "SZ-DL-51002",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Lindiwe Shongwe",
    emergencyContactPhone: "+268 7691 1122",
    assignedVehicleReg: "HSD 505 BM",
    avatarSeed: "mduduzi",
    profilePictureUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200"
  },

  // Manzini Region Drivers
  {
    id: "drv_m1",
    fullName: "Melusi Simelane",
    username: "melusi",
    password: "password123",
    nationalId: "9004125130922",
    phone: "+268 7605 9911",
    licenseNumber: "SZ-DL-88210",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Thobile Simelane",
    emergencyContactPhone: "+268 7805 2244",
    assignedVehicleReg: "MSD 601 MZ",
    avatarSeed: "melusi",
    profilePictureUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_m2",
    fullName: "Bongani Gwebu",
    username: "bongani",
    password: "password123",
    nationalId: "8805225140112",
    phone: "+268 7615 3302",
    licenseNumber: "SZ-DL-55219",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Fikile Gwebu",
    emergencyContactPhone: "+268 7622 8899",
    assignedVehicleReg: "MSD 702 MZ",
    avatarSeed: "bongani",
    profilePictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_m4",
    fullName: "Themba Fakudze",
    username: "themba",
    password: "password123",
    nationalId: "9108195140871",
    phone: "+268 7644 1919",
    licenseNumber: "SZ-DL-91019",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Nokuthula Fakudze",
    emergencyContactPhone: "+268 7688 9119",
    assignedVehicleReg: "MSD 019 MZ",
    avatarSeed: "themba",
    profilePictureUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_m3",
    fullName: "Nhlonipho Tsabedze",
    username: "nhlonipho",
    password: "password123",
    nationalId: "9406185120199",
    phone: "+268 7626 4411",
    licenseNumber: "SZ-DL-33410",
    licenseClass: "Heavy Duty",
    status: "Active",
    emergencyContactName: "Sihle Tsabedze",
    emergencyContactPhone: "+268 7811 5522",
    assignedVehicleReg: "MSD 803 MZ",
    avatarSeed: "nhlonipho",
    profilePictureUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200"
  },

  // Lubombo Region Drivers
  {
    id: "drv_l1",
    fullName: "Sandile Mamba",
    username: "sandile",
    password: "password123",
    nationalId: "8507205160822",
    phone: "+268 7635 1100",
    licenseNumber: "SZ-DL-99011",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Gcinaphi Mamba",
    emergencyContactPhone: "+268 7644 3322",
    assignedVehicleReg: "LSD 901 LU",
    avatarSeed: "sandile",
    profilePictureUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_l2",
    fullName: "Phumlani Shongwe",
    username: "phumlani",
    password: "password123",
    nationalId: "9108155110811",
    phone: "+268 7645 2299",
    licenseNumber: "SZ-DL-11029",
    licenseClass: "Heavy Duty",
    status: "Active",
    emergencyContactName: "Tenele Shongwe",
    emergencyContactPhone: "+268 7833 4400",
    assignedVehicleReg: "LSD 902 LU",
    avatarSeed: "phumlani",
    profilePictureUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200"
  },

  // Shiselweni Region Drivers
  {
    id: "drv_s1",
    fullName: "Mandla Ndlangamandla",
    username: "mandla",
    password: "password123",
    nationalId: "8909105150882",
    phone: "+268 7655 7788",
    licenseNumber: "SZ-DL-22451",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Nomsa Ndlangamandla",
    emergencyContactPhone: "+268 7699 1133",
    assignedVehicleReg: "SSD 501 SH",
    avatarSeed: "mandla",
    profilePictureUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "drv_s2",
    fullName: "Vusi Kunene",
    username: "vusi",
    password: "password123",
    nationalId: "9310245120811",
    phone: "+268 7609 1122",
    licenseNumber: "SZ-DL-66431",
    licenseClass: "Heavy Duty / PDP",
    status: "Active",
    emergencyContactName: "Busisiwe Kunene",
    emergencyContactPhone: "+268 7622 3344",
    assignedVehicleReg: "SSD 502 SH",
    avatarSeed: "vusi",
    profilePictureUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200"
  }
];

// Seed Vehicles with different status, classes, and regional assignment
export const INITIAL_VEHICLES: Vehicle[] = [
  // Hhohho vehicles (Mbabane Rank)
  {
    registrationNumber: "HSD 101 BM",
    fleetNumber: "KF-H01",
    make: "Toyota",
    model: "Quantum Ses’fikile",
    seatingCapacity: 15,
    routeAssignmentId: "h_mb_mz", // Mbabane -> Manzini
    loadingBay: "Bay 1",
    ownerName: "Cyril Kunene",
    ownerPhone: "+268 7602 8899",
    driverId: "drv_h1",
    insuranceExpiry: "2026-12-15",
    roadworthinessExpiry: "2026-09-20",
    status: KombiStatus.Loading,
    classification: "kombi",
    currentQueuePosition: 1,
    tripsToday: 3,
    lastActive: "2026-07-07T07:45:00-07:00",
    loadingStartTime: "07:50",
    loadingDurationMinutes: 20,
    expectedDepartureTime: "08:10"
  },
  {
    registrationNumber: "HSD 202 BM",
    fleetNumber: "KF-H02",
    make: "Toyota",
    model: "Quantum Ses’fikile",
    seatingCapacity: 15,
    routeAssignmentId: "h_mb_mz", // Mbabane -> Manzini
    loadingBay: "Bay 1",
    ownerName: "Cyril Kunene",
    ownerPhone: "+268 7602 8899",
    driverId: "drv_h2",
    insuranceExpiry: "2026-11-10",
    roadworthinessExpiry: "2026-08-15",
    status: KombiStatus.Waiting,
    classification: "kombi",
    currentQueuePosition: 2,
    tripsToday: 2,
    lastActive: "2026-07-07T08:00:00-07:00"
  },
  {
    registrationNumber: "HSD 303 BM",
    fleetNumber: "KF-H03",
    make: "Toyota",
    model: "Quantum Extended",
    seatingCapacity: 16,
    routeAssignmentId: "h_mb_mz", // Mbabane -> Manzini
    loadingBay: "Bay 1",
    ownerName: "Dumisa Mamba",
    ownerPhone: "+268 7614 3300",
    driverId: "drv_h3",
    insuranceExpiry: "2026-10-05",
    roadworthinessExpiry: "2026-07-30",
    status: KombiStatus.Waiting,
    classification: "kombi",
    currentQueuePosition: 3,
    tripsToday: 1,
    lastActive: "2026-07-07T08:15:00-07:00"
  },
  {
    registrationNumber: "HSD 404 BM",
    fleetNumber: "KF-H04",
    make: "Nissan",
    model: "NV350 Impendulo",
    seatingCapacity: 15,
    routeAssignmentId: "h_mb_mz", // Mbabane -> Manzini
    loadingBay: "Bay 1",
    ownerName: "Sabelo Hlophe",
    ownerPhone: "+268 7642 7711",
    driverId: "drv_h4",
    insuranceExpiry: "2027-02-18",
    roadworthinessExpiry: "2026-11-22",
    status: KombiStatus.Waiting,
    classification: "kombi",
    currentQueuePosition: 4,
    tripsToday: 1,
    lastActive: "2026-07-07T08:20:00-07:00"
  },
  {
    registrationNumber: "HSD 505 BM",
    fleetNumber: "KF-H05",
    make: "Mercedes-Benz",
    model: "Sprinter LITE",
    seatingCapacity: 19,
    routeAssignmentId: "h_mb_pp", // Mbabane -> Piggs Peak
    loadingBay: "Bay 2",
    ownerName: "Nomvula Gamedze",
    ownerPhone: "+268 7608 4400",
    driverId: "drv_h5",
    insuranceExpiry: "2027-01-12",
    roadworthinessExpiry: "2026-10-18",
    status: KombiStatus.Delayed,
    classification: "midbus",
    currentQueuePosition: 1,
    tripsToday: 1,
    lastActive: "2026-07-07T08:05:00-07:00"
  },

  // Manzini vehicles (Manzini Hub)
  {
    registrationNumber: "MSD 601 MZ",
    fleetNumber: "MMZ-601",
    vic: "MMZ-601",
    make: "Toyota",
    model: "Quantum Ses’fikile",
    seatingCapacity: 15,
    routeAssignmentId: "m_mz_mb", // Manzini -> Mbabane
    loadingBay: "Bay 1",
    ownerName: "Vusi Shongwe",
    ownerPhone: "+268 7611 2233",
    driverId: "drv_m1",
    insuranceExpiry: "2026-12-01",
    roadworthinessExpiry: "2026-10-15",
    status: KombiStatus.Loading,
    classification: "kombi",
    currentQueuePosition: 1,
    tripsToday: 2,
    lastActive: "2026-07-07T07:45:00-07:00",
    loadingStartTime: "07:55",
    loadingDurationMinutes: 15,
    expectedDepartureTime: "08:10"
  },
  {
    registrationNumber: "MSD 702 MZ",
    fleetNumber: "MMZ-702",
    vic: "MMZ-702",
    make: "Toyota",
    model: "Quantum Extended",
    seatingCapacity: 16,
    routeAssignmentId: "m_mz_mb", // Manzini -> Mbabane
    loadingBay: "Bay 1",
    ownerName: "Zandile Dube",
    ownerPhone: "+268 7654 9988",
    driverId: "drv_m2",
    insuranceExpiry: "2026-11-20",
    roadworthinessExpiry: "2026-09-10",
    status: KombiStatus.Waiting,
    classification: "kombi",
    currentQueuePosition: 2,
    tripsToday: 1,
    lastActive: "2026-07-07T08:00:00-07:00"
  },
  {
    registrationNumber: "MSD 019 MZ",
    fleetNumber: "MMZ-019",
    vic: "MMZ-019",
    make: "Toyota",
    model: "Quantum Ses’fikile",
    seatingCapacity: 15,
    routeAssignmentId: "m_mz_mb", // Manzini -> Mbabane
    loadingBay: "Bay 1",
    ownerName: "Zandile Dube",
    ownerPhone: "+268 7654 9988",
    driverId: "drv_m4",
    insuranceExpiry: "2026-11-20",
    roadworthinessExpiry: "2026-09-10",
    status: KombiStatus.Waiting,
    classification: "kombi",
    currentQueuePosition: 3,
    tripsToday: 1,
    lastActive: "2026-07-07T08:05:00-07:00"
  },
  {
    registrationNumber: "MSD 803 MZ",
    fleetNumber: "KF-M03",
    make: "Nissan",
    model: "NV350 Impendulo",
    seatingCapacity: 15,
    routeAssignmentId: "m_mz_mt", // Manzini -> Matsapha
    loadingBay: "Bay 2",
    ownerName: "Gugu Masuku",
    ownerPhone: "+268 7609 1122",
    driverId: "drv_m3",
    insuranceExpiry: "2027-01-10",
    roadworthinessExpiry: "2026-11-15",
    status: KombiStatus.Waiting,
    classification: "kombi",
    currentQueuePosition: 1,
    tripsToday: 4,
    lastActive: "2026-07-07T08:10:00-07:00"
  },

  // Lubombo vehicles (Siteki Gate Rank)
  {
    registrationNumber: "LSD 901 LU",
    fleetNumber: "KF-L01",
    make: "Toyota",
    model: "Quantum Ses’fikile",
    seatingCapacity: 15,
    routeAssignmentId: "l_st_mz", // Siteki -> Manzini
    loadingBay: "Bay 1",
    ownerName: "Themba Ndlela",
    ownerPhone: "+268 7632 8844",
    driverId: "drv_l1",
    insuranceExpiry: "2026-10-18",
    roadworthinessExpiry: "2026-08-12",
    status: KombiStatus.Loading,
    classification: "kombi",
    currentQueuePosition: 1,
    tripsToday: 3,
    lastActive: "2026-07-07T07:30:00-07:00",
    loadingStartTime: "08:00",
    loadingDurationMinutes: 25,
    expectedDepartureTime: "08:25"
  },
  {
    registrationNumber: "LSD 902 LU",
    fleetNumber: "KF-L02",
    make: "Nissan",
    model: "NV350",
    seatingCapacity: 15,
    routeAssignmentId: "l_st_bb", // Siteki -> Big Bend
    loadingBay: "Bay 2",
    ownerName: "Nathi Myeni",
    ownerPhone: "+268 7623 4400",
    driverId: "drv_l2",
    insuranceExpiry: "2026-11-05",
    roadworthinessExpiry: "2026-09-12",
    status: KombiStatus.Waiting,
    classification: "kombi",
    currentQueuePosition: 1,
    tripsToday: 1,
    lastActive: "2026-07-07T08:00:00-07:00"
  },

  // Shiselweni vehicles (Nhlangano Rank)
  {
    registrationNumber: "SSD 501 SH",
    fleetNumber: "KF-S01",
    make: "Toyota",
    model: "Quantum Ses’fikile",
    seatingCapacity: 15,
    routeAssignmentId: "s_nh_mz", // Nhlangano -> Manzini
    loadingBay: "Bay 1",
    ownerName: "Lethu Simelane",
    ownerPhone: "+268 7655 4411",
    driverId: "drv_s1",
    insuranceExpiry: "2026-12-10",
    roadworthinessExpiry: "2026-09-30",
    status: KombiStatus.Loading,
    classification: "kombi",
    currentQueuePosition: 1,
    tripsToday: 2,
    lastActive: "2026-07-07T07:15:00-07:00",
    loadingStartTime: "08:05",
    loadingDurationMinutes: 30,
    expectedDepartureTime: "08:35"
  },
  {
    registrationNumber: "SSD 502 SH",
    fleetNumber: "KF-S02",
    make: "Scania",
    model: "F310 Marcopolo",
    seatingCapacity: 65,
    routeAssignmentId: "s_nh_hl", // Nhlangano -> Hlathikhulu
    loadingBay: "Bay 2",
    ownerName: "Veli Tsabedze",
    ownerPhone: "+268 7611 0022",
    driverId: "drv_s2",
    insuranceExpiry: "2027-02-05",
    roadworthinessExpiry: "2026-11-18",
    status: KombiStatus.Waiting,
    classification: "bus",
    currentQueuePosition: 1,
    tripsToday: 2,
    lastActive: "2026-07-07T08:05:00-07:00"
  }
];

// Seed Historical Trips for Revenue & Fleet Analytics
export const INITIAL_TRIPS: Trip[] = [
  { id: "trip_1001", date: "2026-07-06", departureTime: "06:00", arrivalTime: "06:45", routeId: "h_mb_mz", vehicleReg: "HSD 101 BM", driverId: "drv_h1", passengerCount: 15, tripDurationMinutes: 45, status: "Completed", revenueSZL: 825 },
  { id: "trip_1002", date: "2026-07-06", departureTime: "06:15", arrivalTime: "07:35", routeId: "h_mb_pp", vehicleReg: "HSD 505 BM", driverId: "drv_h5", passengerCount: 18, tripDurationMinutes: 80, status: "Completed", revenueSZL: 1350 },
  { id: "trip_1003", date: "2026-07-06", departureTime: "06:30", arrivalTime: "06:50", routeId: "h_mb_lb", vehicleReg: "HSD 202 BM", driverId: "drv_h2", passengerCount: 15, tripDurationMinutes: 20, status: "Completed", revenueSZL: 375 },
  { id: "trip_1004", date: "2026-07-06", departureTime: "06:45", arrivalTime: "07:30", routeId: "h_mb_mz", vehicleReg: "HSD 303 BM", driverId: "drv_h3", passengerCount: 16, tripDurationMinutes: 45, status: "Completed", revenueSZL: 880 },
  { id: "trip_1005", date: "2026-07-06", departureTime: "07:00", arrivalTime: "07:22", routeId: "h_mb_lb", vehicleReg: "HSD 404 BM", driverId: "drv_h4", passengerCount: 15, tripDurationMinutes: 22, status: "Completed", revenueSZL: 375 },
  { id: "trip_1006", date: "2026-07-06", departureTime: "07:15", arrivalTime: "08:00", routeId: "h_mb_mz", vehicleReg: "HSD 101 BM", driverId: "drv_h1", passengerCount: 15, tripDurationMinutes: 45, status: "Completed", revenueSZL: 825 },
  { id: "trip_1007", date: "2026-07-06", departureTime: "07:30", arrivalTime: "07:55", routeId: "h_mb_lb", vehicleReg: "HSD 202 BM", driverId: "drv_h2", passengerCount: 14, tripDurationMinutes: 25, status: "Completed", revenueSZL: 350 },
  { id: "trip_1008", date: "2026-07-06", departureTime: "08:00", arrivalTime: "08:15", routeId: "m_mz_mt", vehicleReg: "MSD 803 MZ", driverId: "drv_m3", passengerCount: 15, tripDurationMinutes: 15, status: "Completed", revenueSZL: 300 }
];

// Seed SMS / WhatsApp Notifications Log
export const INITIAL_NOTIFICATIONS: RankNotification[] = [
  { id: "notif_1", timestamp: "2026-07-07T08:00:15Z", type: "SMS", recipientName: "Sibusiso Dlamini", recipientPhone: "+268 7604 1234", message: "KombiFlow: Vehicle HSD 101 BM is NEXT to load on Bay 1 at Mbabane Main Rank. Set status to Loading.", status: "Delivered" },
  { id: "notif_2", timestamp: "2026-07-07T08:05:22Z", type: "WhatsApp", recipientName: "Mduduzi Shongwe", recipientPhone: "+268 7655 4321", message: "Your departure countdown schedule for Piggs Peak has commenced on Bay 2. Proceed to load.", status: "Delivered" },
  { id: "notif_3", timestamp: "2026-07-07T08:15:00Z", type: "Push", recipientName: "Gcina Masuku", recipientPhone: "+268 7611 9876", message: "KombiFlow queue placement changed. You are now at position #2 for route Mbabane -> Manzini.", status: "Sent" }
];

// Seed Incident Reports with chat messages log included
export const INITIAL_INCIDENTS: IncidentReport[] = [
  {
    id: "inc_1",
    timestamp: "2026-07-06T14:30:00Z",
    reporterName: "Sibongile Ndlangamandla",
    reporterPhone: "+268 7812 4499",
    category: "Lost property",
    description: "I forgot a black purse inside HSD 101 BM. It contains my National ID Card and driver's license. I am positive I left it on the front row seat.",
    vehicleReg: "HSD 101 BM",
    routeId: "h_mb_mz",
    status: "Investigating",
    escalatedTo: "Local Transport Association",
    reporterType: "Commuter",
    messages: [
      {
        id: "msg_1",
        sender: "Commuter",
        senderName: "Sibongile Ndlangamandla",
        text: "Please let me know if the driver Sibusiso found it. I need my ID urgently.",
        timestamp: "2026-07-06T14:32:00Z"
      },
      {
        id: "msg_2",
        sender: "Inspector",
        senderName: "Mbabane Rank Inspector",
        text: "We have contacted driver Sibusiso Dlamini. He is currently on a return route and will inspect the front row at the next stop.",
        timestamp: "2026-07-06T14:45:00Z"
      }
    ]
  },
  {
    id: "inc_2",
    timestamp: "2026-07-06T16:45:00Z",
    reporterName: "Thulani Simelane",
    reporterPhone: "+268 7603 5511",
    category: "Dangerous driving",
    description: "The driver of MSD 702 MZ was driving recklessly, overtaking several vehicles on double solid lines near the Malagwane Hill bypass.",
    vehicleReg: "MSD 702 MZ",
    routeId: "m_mz_mb",
    status: "Escalated",
    escalatedTo: "National Road Transportation Council (NRTC)",
    reporterType: "Commuter",
    messages: [
      {
        id: "msg_3",
        sender: "Inspector",
        senderName: "National Highway Controller",
        text: "Reckless behavior reported to NRTC. Driver Bongani Gwebu will be summoned for an immediate safety compliance review.",
        timestamp: "2026-07-06T17:10:00Z"
      }
    ]
  },
  {
    id: "inc_3",
    timestamp: "2026-07-07T08:10:00Z",
    reporterName: "Nomsa Shabangu",
    reporterPhone: "+268 7914 2288",
    category: "Service complaint",
    description: "Mbabane Rank Bay 1 loading sequence was delayed by 25 minutes due to arguments about the queue dispatch order.",
    routeId: "h_mb_mz",
    status: "Resolved",
    escalatedTo: "None",
    reporterType: "Commuter",
    messages: [
      {
        id: "msg_4",
        sender: "Inspector",
        senderName: "Mbabane Admin",
        text: "Queue sequence audit performed. We have implemented automated loading sequence control on digital TV boards to prevent sequence arguments.",
        timestamp: "2026-07-07T08:30:00Z"
      }
    ]
  }
];

// Seed Rank Fee Payments (E25 base fee standard)
export const INITIAL_PAYMENTS: RankFeePayment[] = [
  {
    id: "pay_1",
    timestamp: "2026-07-07T06:15:00Z",
    vehicleReg: "HSD 101 BM",
    amountSZL: 25,
    paymentMethod: "MTN MoMo",
    transactionRef: "MOMO-99281-SZ",
    status: "Success",
    allocationOperational: 20.00,
    allocationNRTC: 3.50,
    allocationMaintenance: 1.50
  },
  {
    id: "pay_2",
    timestamp: "2026-07-07T07:10:00Z",
    vehicleReg: "MSD 601 MZ",
    amountSZL: 25,
    paymentMethod: "e-Mlangeni",
    transactionRef: "EML-48191-SZ",
    status: "Success",
    allocationOperational: 20.00,
    allocationNRTC: 3.50,
    allocationMaintenance: 1.50
  },
  {
    id: "pay_3",
    timestamp: "2026-07-07T08:05:00Z",
    vehicleReg: "LSD 901 LU",
    amountSZL: 25,
    paymentMethod: "MTN MoMo",
    transactionRef: "MOMO-77112-SZ",
    status: "Success",
    allocationOperational: 20.00,
    allocationNRTC: 3.50,
    allocationMaintenance: 1.50
  }
];

// Seed Registered Marshals and Rank Fee accounts
export const INITIAL_MARSHALS: MarshalAccount[] = [
  { 
    id: "mar_1", 
    fullName: "Sipho Shongwe", 
    region: "Hhohho", 
    terminalName: "Mbabane Bus Terminus", 
    avatarSeed: "sipho",
    assignedRouteId: "h_mb_mz",
    badgeNumber: "MSH-014",
    phone: "+268 7602 4411"
  },
  { 
    id: "mar_2", 
    fullName: "Thabo Tsabedze", 
    region: "Manzini", 
    terminalName: "Manzini Satellite Rank", 
    avatarSeed: "thabo",
    assignedRouteId: "m_mz_mb",
    badgeNumber: "MSH-028",
    phone: "+268 7611 8822"
  },
  { 
    id: "mar_3", 
    fullName: "Gcina Dlamini", 
    region: "Lubombo", 
    terminalName: "Siteki Central Rank", 
    avatarSeed: "gcina",
    assignedRouteId: "l_st_mz",
    badgeNumber: "MSH-035",
    phone: "+268 7633 9900"
  },
  { 
    id: "mar_4", 
    fullName: "Vusi Ndlovu", 
    region: "Shiselweni", 
    terminalName: "Nhlangano Bus Station", 
    avatarSeed: "vusi",
    assignedRouteId: "s_nh_mz",
    badgeNumber: "MSH-042",
    phone: "+268 7655 1199"
  }
];

export const INITIAL_MARSHAL_TRANSACTIONS: MarshalTransaction[] = [
  { id: "mtx_1", marshalId: "mar_1", timestamp: "2026-06-15T10:30:00Z", date: "2026-06-15", month: "2026-06", vehicleReg: "HSD 101 BM", amountSZL: 25, triggerSource: "Depart Button" },
  { id: "mtx_2", marshalId: "mar_1", timestamp: "2026-07-18T14:22:00Z", date: "2026-07-18", month: "2026-07", vehicleReg: "HSD 102 BM", amountSZL: 25, triggerSource: "Full Cabin Button" },
  { id: "mtx_3", marshalId: "mar_1", timestamp: "2026-07-20T08:15:00Z", date: "2026-07-20", month: "2026-07", vehicleReg: "HSD 101 BM", amountSZL: 25, triggerSource: "Depart Button" },
  { id: "mtx_4", marshalId: "mar_2", timestamp: "2026-06-12T11:45:00Z", date: "2026-06-12", month: "2026-06", vehicleReg: "MSD 601 MZ", amountSZL: 25, triggerSource: "Full Cabin Button" },
  { id: "mtx_5", marshalId: "mar_2", timestamp: "2026-07-19T09:30:00Z", date: "2026-07-19", month: "2026-07", vehicleReg: "MSD 602 MZ", amountSZL: 25, triggerSource: "Depart Button" },
  { id: "mtx_6", marshalId: "mar_3", timestamp: "2026-07-10T16:10:00Z", date: "2026-07-10", month: "2026-07", vehicleReg: "LSD 901 LU", amountSZL: 25, triggerSource: "Full Cabin Button" },
  { id: "mtx_7", marshalId: "mar_4", timestamp: "2026-07-05T12:00:00Z", date: "2026-07-05", month: "2026-07", vehicleReg: "SSD 301 SH", amountSZL: 25, triggerSource: "Depart Button" }
];

// Seed Regional Configurations for the administrative hubs of Eswatini
export const INITIAL_REGION_CONFIGS: RegionConfig[] = [
  {
    region: EswatiniRegion.Hhohho,
    terminalName: "Mbabane Main Rank Plaza",
    emergencyNumber: "+268 2404 2221",
    announcement: "ANNOUNCEMENT: Mbabane-Manzini Express commuters please board vehicle HSD 101 BM now loading on Bay 1. Safe travel!"
  },
  {
    region: EswatiniRegion.Manzini,
    terminalName: "Manzini Hub Satellite Terminal",
    emergencyNumber: "+268 2505 4444",
    announcement: "ANNOUNCEMENT: Commuters to Matsapha Industrial Site can board the Kombi currently stationed on Bay 2."
  },
  {
    region: EswatiniRegion.Lubombo,
    terminalName: "Siteki Gate Interchange",
    emergencyNumber: "+268 2343 5555",
    announcement: "ANNOUNCEMENT: Siteki to Manzini corridor Kombis are now boarding. Departures scheduled hourly on Bay 1."
  },
  {
    region: EswatiniRegion.Shiselweni,
    terminalName: "Nhlangano Central Terminal",
    emergencyNumber: "+268 2207 8888",
    announcement: "ANNOUNCEMENT: The Nhlangano express coach is currently loading passengers on Dock 1."
  }
];

// Seed Law Enforcement Traffic Tickets
export const INITIAL_TRAFFIC_TICKETS: TrafficTicket[] = [
  {
    id: "ticket_0",
    ticketNumber: "REPS-2026-0742",
    timestamp: "2026-07-12T09:30:00Z",
    vehicleReg: "HSD 101 BM",
    officerName: "Inspector S. Dlamini",
    officerBadge: "RP-4432",
    offenseType: "Illegal Picking/Dropping",
    amountSZL: 300,
    location: "Mbabane Rank Corridor Entrance",
    status: "Synchronized",
    notes: "Loading passengers in an undesignated loading zone."
  },
  {
    id: "ticket_1",
    ticketNumber: "REPS-2026-0811",
    timestamp: "2026-07-06T10:15:00Z",
    vehicleReg: "HSD 202 BM",
    officerName: "Inspector G. Dlamini",
    officerBadge: "RP-8812",
    offenseType: "Speeding",
    amountSZL: 350,
    location: "Malagwane Hill Speed Trap",
    status: "Synchronized",
    notes: "Captured clocked at 98 km/h in an 80 km/h zone."
  },
  {
    id: "ticket_2",
    ticketNumber: "REPS-2026-0925",
    timestamp: "2026-07-06T15:30:00Z",
    vehicleReg: "MSD 702 MZ",
    officerName: "Officer S. Simelane",
    officerBadge: "RP-4029",
    offenseType: "Overloading",
    amountSZL: 500,
    location: "Matsapha Toll Plaza Checkpoint",
    status: "Issued",
    notes: "Carrying 17 passengers in a certified 15-seater Quantum."
  },
  {
    id: "ticket_3",
    ticketNumber: "REPS-2026-1102",
    timestamp: "2026-07-07T08:12:00Z",
    vehicleReg: "HSD 505 BM",
    officerName: "Inspector M. Khumalo",
    officerBadge: "RP-9102",
    offenseType: "Expired Permit",
    amountSZL: 750,
    location: "Mbabane Bypass Junction",
    status: "Synchronized",
    notes: "Operating without a validated Corridor Permit for Piggs Peak."
  }
];

// Seed Adverts for digital display boards & admin tracking
export const INITIAL_ADVERTS: Advert[] = [
  {
    id: "adv_1",
    title: "MTN MoMo E10 Mobile Data & Cash Cashback Promo",
    sponsorName: "MTN Eswatini",
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
    targetRegions: ["All"],
    isActive: true,
    createdAt: "2026-07-22T08:00:00Z",
    fileSizeBytes: 420000,
    description: "Pay for your daily kombi fare using MTN MoMo Pay at any municipal loading bay and receive 10% instant airtime cashback directly to your mobile wallet plus 500MB free transit data.",
    promoCode: "MOMO-TRANSIT",
    contactPhone: "+268 7606 0000",
    websiteUrl: "https://www.mtn.co.sz/momo",
    category: "Fintech & Mobile Banking",
    budgetSZL: 5000,
    impressions: 14200,
    clicks: 1840
  },
  {
    id: "adv_2",
    title: "Eswatini Royal Insurance Corporation (ESRIC) Public Liability & Passenger Cover",
    sponsorName: "ESRIC Eswatini",
    imageUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
    targetRegions: ["Hhohho", "Manzini"],
    isActive: true,
    createdAt: "2026-07-25T10:00:00Z",
    fileSizeBytes: 512000,
    description: "Ensure your fleet and passengers are 100% safeguarded under Swaziland's premier comprehensive motor & passenger liability policies. Special discount rates for certified rank association members.",
    promoCode: "ESRIC-FLEET-26",
    contactPhone: "+268 2404 3231",
    websiteUrl: "https://www.esric.sz",
    category: "Insurance & Security",
    budgetSZL: 4200,
    impressions: 9800,
    clicks: 890
  },
  {
    id: "adv_3",
    title: "Standard Bank Eswatini Unayo Digital Commuter Wallet",
    sponsorName: "Standard Bank Eswatini",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
    targetRegions: ["All"],
    isActive: true,
    createdAt: "2026-08-01T09:00:00Z",
    fileSizeBytes: 380000,
    description: "Send money, pay kombi operators without cash, and withdraw at hundreds of local spaza shops and rank merchants nationwide. Zero monthly account management fees.",
    promoCode: "UNAYO-SISONKHE",
    contactPhone: "+268 2404 6549",
    websiteUrl: "https://www.standardbank.co.sz/unayo",
    category: "Banking & Financial Services",
    budgetSZL: 3800,
    impressions: 11500,
    clicks: 1220
  }
];

// LocalStorage Helper Keys
const STORAGE_KEY_PREFIX = "kombiflow_";

export function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (val) return JSON.parse(val) as T;
  } catch (e) {
    console.error("Error loading localStorage key: " + key, e);
  }
  return defaultValue;
}

export function setStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
    pushServerState({ [key]: data });
  } catch (e) {
    console.error("Error saving localStorage key: " + key, e);
  }
}

export function initializeKombiflowStorage() {
  const routesData = localStorage.getItem(STORAGE_KEY_PREFIX + "routes");
  
  // Dynamic enrichment function
  const enrichData = () => {
    // Enrich vehicles
    const enrichedVehicles = INITIAL_VEHICLES.map((v, idx) => {
      const vic = v.vic || generateVIC(v.registrationNumber);
      
      // Assign Transport Association based on region
      let assoc = "Mbabane Transport Association";
      if (v.registrationNumber.startsWith("M")) assoc = "Manzini Transport Association";
      else if (v.registrationNumber.startsWith("L")) assoc = "Siteki Transport Association";
      else if (v.registrationNumber.startsWith("S")) assoc = "Nhlangano Transport Association";

      return {
        ...v,
        vic,
        fleetNumber: vic, // Replaces Fleet ID with VIC throughout the system
        permitNumber: `G10${90 + idx}/2026`,
        permitStatus: (idx === 3 ? "Expired" : idx === 4 ? "Suspended" : "Active") as any,
        permitIssueDate: "2025-07-14",
        permitExpiryDate: idx === 3 ? "2026-06-14" : "2027-07-14",
        cofNumber: `COF-${5020 + idx}-SZ`,
        cofIssueDate: "2025-07-14",
        cofExpiryDate: idx === 2 ? "2026-07-20" : "2027-07-14", // upcoming expiry soon
        association: assoc,
        loadingBay: v.loadingBay || `Bay ${(idx % 12 + 1).toString().padStart(2, "0")}`
      };
    });

    // Enrich drivers
    const enrichedDrivers = INITIAL_DRIVERS.map((d, idx) => {
      return {
        ...d,
        pdpNumber: `PDP-220${10 + idx}`,
        pdpIssueDate: "2025-07-14",
        pdpExpiryDate: idx === 3 ? "2026-07-16" : "2027-07-14", // index 3 expires soon
        pdpIssuingAuthority: "Eswatini Road Transport Dept",
        pdpStatus: (idx === 4 ? "Suspended" : idx === 3 ? "Expired" : "Valid") as any,
        driverLicenceType: "Permanent" as const,
        status: (idx === 4 ? "Suspended" : "Active") as any
      };
    });

    // Sync relationships
    const fullySyncedDrivers = enrichedDrivers.map(d => syncDriverWithVehicle(d, enrichedVehicles, INITIAL_ROUTES));

    localStorage.clear();
    setStoredData("routes", INITIAL_ROUTES);
    setStoredData("drivers", fullySyncedDrivers);
    setStoredData("vehicles", enrichedVehicles);
    setStoredData("trips", INITIAL_TRIPS);
    setStoredData("notifications", INITIAL_NOTIFICATIONS);
    setStoredData("incidents", INITIAL_INCIDENTS);
    setStoredData("payments", INITIAL_PAYMENTS);
    setStoredData("regionConfigs", INITIAL_REGION_CONFIGS);
    setStoredData("trafficTickets", INITIAL_TRAFFIC_TICKETS);
    setStoredData("marshals", INITIAL_MARSHALS);
    setStoredData("marshalTransactions", INITIAL_MARSHAL_TRANSACTIONS);
    setStoredData("rankFee", 25);
    setStoredData("splitOperational", 20.00);
    setStoredData("splitNRTC", 3.50);
    setStoredData("splitMaintenance", 1.50);
    setStoredData("adverts", INITIAL_ADVERTS);
  };

  if (!routesData || routesData.includes('"h1"')) {
    enrichData();
    return;
  }

  // Fallbacks if tables missing
  if (!localStorage.getItem(STORAGE_KEY_PREFIX + "drivers") || !localStorage.getItem(STORAGE_KEY_PREFIX + "vehicles")) {
    enrichData();
    return;
  }

  if (!localStorage.getItem(STORAGE_KEY_PREFIX + "adverts")) {
    setStoredData("adverts", INITIAL_ADVERTS);
  }
}
