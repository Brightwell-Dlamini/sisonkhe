/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified fleet store. Single source of truth for all client-side fleet state.
 *
 * Replaces the previous 4-way sync in App.tsx:
 *   - localStorage reads/writes scattered across components
 *   - React state in App.tsx
 *   - Server state via /api/fleet/sync polling
 *   - URL systemState param
 *
 * Design:
 *   - Zustand for state (small, fast, no context provider churn)
 *   - Per-slice reducers (vehicles, drivers, trips, etc.)
 *   - Persistence via IndexedDB (see ./persistence)
 *   - Sync via event log (see ./sync)
 *   - Selectors memoized per-slice
 */

"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Vehicle,
  Driver,
  Route,
  Trip,
  RankNotification,
  IncidentReport,
  RankFeePayment,
  RegionConfig,
  TrafficTicket,
  MarshalAccount,
  MarshalTransaction,
  Advert,
  EswatiniRegion,
} from "../types";
import {
  INITIAL_ROUTES,
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_TRIPS,
  INITIAL_NOTIFICATIONS,
  INITIAL_INCIDENTS,
  INITIAL_PAYMENTS,
  INITIAL_REGION_CONFIGS,
  INITIAL_TRAFFIC_TICKETS,
  INITIAL_MARSHALS,
  INITIAL_MARSHAL_TRANSACTIONS,
  INITIAL_ADVERTS,
} from "../utils/mockData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FleetState {
  // Data slices
  routes: Route[];
  drivers: Driver[];
  vehicles: Vehicle[];
  trips: Trip[];
  notifications: RankNotification[];
  incidents: IncidentReport[];
  payments: RankFeePayment[];
  regionConfigs: RegionConfig[];
  trafficTickets: TrafficTicket[];
  marshals: MarshalAccount[];
  marshalTransactions: MarshalTransaction[];
  adverts: Advert[];

  // Config
  activeRegion: EswatiniRegion;
  rankFee: number;
  splitOperational: number;
  splitNRTC: number;
  splitMaintenance: number;
  moveLoadingToBottom: boolean;
  isDarkMode: boolean;

  // Meta
  hydrated: boolean;
  lastServerSeq: number;
  lastSyncAt: number | null;
}

export interface FleetActions {
  // Hydration
  hydrate: (partial?: Partial<FleetState>) => void;

  // Vehicle ops
  addVehicle: (v: Vehicle) => void;
  updateVehicle: (reg: string, patch: Partial<Vehicle>) => void;
  updateVehicles: (updater: (v: Vehicle[]) => Vehicle[]) => void;
  deleteVehicle: (reg: string) => void;

  // Driver ops
  addDriver: (d: Driver) => void;
  updateDriver: (id: string, patch: Partial<Driver>) => void;
  updateDrivers: (updater: (d: Driver[]) => Driver[]) => void;
  deleteDriver: (id: string) => void;

  // Route ops
  addRoute: (r: Route) => void;
  updateRoute: (id: string, patch: Partial<Route>) => void;
  deleteRoute: (id: string) => void;

  // Trip ops
  addTrip: (t: Trip) => void;

  // Notification ops
  addNotification: (n: RankNotification) => void;

  // Incident ops
  addIncident: (i: IncidentReport) => void;
  updateIncident: (id: string, patch: Partial<IncidentReport>) => void;

  // Payment ops
  addPayment: (p: RankFeePayment) => void;

  // Region config ops
  updateRegionConfig: (region: string, patch: Partial<RegionConfig>) => void;

  // Traffic ticket ops
  addTrafficTicket: (t: TrafficTicket) => void;

  // Marshal ops
  addMarshal: (m: MarshalAccount) => void;
  updateMarshal: (id: string, patch: Partial<MarshalAccount>) => void;
  addMarshalTransaction: (t: MarshalTransaction) => void;

  // Advert ops
  addAdvert: (a: Advert) => void;
  updateAdvert: (id: string, patch: Partial<Advert>) => void;
  deleteAdvert: (id: string) => void;

  // Config ops
  setActiveRegion: (r: EswatiniRegion) => void;
  setRankFee: (fee: number) => void;
  setRankFeeSplits: (ops: number, nrtc: number, maint: number) => void;
  setMoveLoadingToBottom: (v: boolean) => void;
  setDarkMode: (v: boolean) => void;

  // Sync meta
  setLastServerSeq: (seq: number) => void;
  markSynced: () => void;
}

export type FleetStore = FleetState & FleetActions;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: FleetState = {
  routes: INITIAL_ROUTES,
  drivers: INITIAL_DRIVERS,
  vehicles: INITIAL_VEHICLES,
  trips: INITIAL_TRIPS,
  notifications: INITIAL_NOTIFICATIONS,
  incidents: INITIAL_INCIDENTS,
  payments: INITIAL_PAYMENTS,
  regionConfigs: INITIAL_REGION_CONFIGS,
  trafficTickets: INITIAL_TRAFFIC_TICKETS,
  marshals: INITIAL_MARSHALS,
  marshalTransactions: INITIAL_MARSHAL_TRANSACTIONS,
  adverts: INITIAL_ADVERTS,

  activeRegion: "Hhohho" as EswatiniRegion,
  rankFee: 25,
  splitOperational: 20.0,
  splitNRTC: 3.5,
  splitMaintenance: 1.5,
  moveLoadingToBottom: true,
  isDarkMode: true,

  hydrated: false,
  lastServerSeq: 0,
  lastSyncAt: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFleetStore = create<FleetStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // --- Hydration -----------------------------------------------------------
    hydrate: (partial) =>
      set((state) => ({
        ...state,
        ...partial,
        hydrated: true,
      })),

    // --- Vehicles ------------------------------------------------------------
    addVehicle: (v) =>
      set((state) => ({ vehicles: [...state.vehicles, v] })),

    updateVehicle: (reg, patch) =>
      set((state) => ({
        vehicles: state.vehicles.map((v) =>
          v.registrationNumber === reg ? { ...v, ...patch } : v
        ),
      })),

    updateVehicles: (updater) =>
      set((state) => ({ vehicles: updater(state.vehicles) })),

    deleteVehicle: (reg) =>
      set((state) => ({
        vehicles: state.vehicles.filter((v) => v.registrationNumber !== reg),
        drivers: state.drivers.map((d) =>
          d.assignedVehicleReg === reg ? { ...d, assignedVehicleReg: "" } : d
        ),
      })),

    // --- Drivers -------------------------------------------------------------
    addDriver: (d) =>
      set((state) => ({ drivers: [...state.drivers, d] })),

    updateDriver: (id, patch) =>
      set((state) => ({
        drivers: state.drivers.map((d) =>
          d.id === id ? { ...d, ...patch } : d
        ),
      })),

    updateDrivers: (updater) =>
      set((state) => ({ drivers: updater(state.drivers) })),

    deleteDriver: (id) =>
      set((state) => ({
        drivers: state.drivers.filter((d) => d.id !== id),
        vehicles: state.vehicles.map((v) =>
          v.driverId === id ? { ...v, driverId: "" } : v
        ),
      })),

    // --- Routes --------------------------------------------------------------
    addRoute: (r) => set((state) => ({ routes: [...state.routes, r] })),

    updateRoute: (id, patch) =>
      set((state) => ({
        routes: state.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),

    deleteRoute: (id) =>
      set((state) => ({ routes: state.routes.filter((r) => r.id !== id) })),

    // --- Trips ---------------------------------------------------------------
    addTrip: (t) => set((state) => ({ trips: [...state.trips, t] })),

    // --- Notifications -------------------------------------------------------
    addNotification: (n) =>
      set((state) => ({ notifications: [...state.notifications, n] })),

    // --- Incidents -----------------------------------------------------------
    addIncident: (i) =>
      set((state) => ({ incidents: [...state.incidents, i] })),

    updateIncident: (id, patch) =>
      set((state) => ({
        incidents: state.incidents.map((i) =>
          i.id === id ? { ...i, ...patch } : i
        ),
      })),

    // --- Payments ------------------------------------------------------------
    addPayment: (p) => set((state) => ({ payments: [...state.payments, p] })),

    // --- Region configs ------------------------------------------------------
    updateRegionConfig: (region, patch) =>
      set((state) => ({
        regionConfigs: state.regionConfigs.map((c) =>
          c.region === region ? { ...c, ...patch } : c
        ),
      })),

    // --- Traffic tickets -----------------------------------------------------
    addTrafficTicket: (t) =>
      set((state) => ({ trafficTickets: [...state.trafficTickets, t] })),

    // --- Marshals ------------------------------------------------------------
    addMarshal: (m) => set((state) => ({ marshals: [...state.marshals, m] })),

    updateMarshal: (id, patch) =>
      set((state) => ({
        marshals: state.marshals.map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
      })),

    addMarshalTransaction: (t) =>
      set((state) => ({
        marshalTransactions: [...state.marshalTransactions, t],
      })),

    // --- Adverts -------------------------------------------------------------
    addAdvert: (a) => set((state) => ({ adverts: [...state.adverts, a] })),

    updateAdvert: (id, patch) =>
      set((state) => ({
        adverts: state.adverts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),

    deleteAdvert: (id) =>
      set((state) => ({ adverts: state.adverts.filter((a) => a.id !== id) })),

    // --- Config --------------------------------------------------------------
    setActiveRegion: (r) => set({ activeRegion: r }),
    setRankFee: (fee) => set({ rankFee: fee }),
    setRankFeeSplits: (ops, nrtc, maint) =>
      set({
        splitOperational: ops,
        splitNRTC: nrtc,
        splitMaintenance: maint,
      }),
    setMoveLoadingToBottom: (v) => set({ moveLoadingToBottom: v }),
    setDarkMode: (v) => set({ isDarkMode: v }),

    // --- Sync meta -----------------------------------------------------------
    setLastServerSeq: (seq) => set({ lastServerSeq: seq }),
    markSynced: () => set({ lastSyncAt: Date.now() }),
  }))
);

// ---------------------------------------------------------------------------
// Selectors (memoized by zustand via subscribeWithSelector)
// ---------------------------------------------------------------------------

export const selectVehiclesByRegion = (region: EswatiniRegion) => (state: FleetStore) =>
  state.vehicles.filter((v) => {
    const route = state.routes.find((r) => r.id === v.routeAssignmentId);
    return route?.region === region;
  });

export const selectVehiclesByRoute = (routeId: string) => (state: FleetStore) =>
  state.vehicles.filter((v) => v.routeAssignmentId === routeId);

export const selectQueueForRoute = (routeId: string) => (state: FleetStore) =>
  state.vehicles
    .filter((v) => v.routeAssignmentId === routeId && v.currentQueuePosition > 0)
    .sort((a, b) => a.currentQueuePosition - b.currentQueuePosition);

export const selectMarshalsByRegion = (region: string) => (state: FleetStore) =>
  state.marshals.filter((m) => m.region === region);

export const selectAdvertsForRegion = (region: EswatiniRegion) => (state: FleetStore) =>
  state.adverts.filter(
    (a) =>
      a.isActive &&
      (a.targetRegions.includes("All") || a.targetRegions.includes(region))
  );

// ---------------------------------------------------------------------------
// Reset (for tests)
// ---------------------------------------------------------------------------

export function __resetFleetStoreForTests() {
  useFleetStore.setState(initialState, true);
}
