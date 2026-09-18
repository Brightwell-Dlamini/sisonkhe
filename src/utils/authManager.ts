/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Driver, FleetOperator, MarshalAccount } from "../types";
import { INITIAL_DRIVERS, getStoredData, setStoredData } from "./mockData";
import { INITIAL_OPERATORS } from "./operatorCards";
import { pushServerState } from "./syncManager";

export type AuthRole = 
  | "super-admin" 
  | "operator" 
  | "driver" 
  | "admin" 
  | "fleet-manager" 
  | "inspector" 
  | "commuter";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: AuthRole;
  roleDisplay: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  status: "Active" | "Suspended" | "Locked";
  assignedVehicleReg?: string;
  assignedRouteId?: string;
  operatorId?: string;
  password?: string;
  badgeNumber?: string;
  department?: string;
  lastLogin?: string;
}

const CURRENT_USER_KEY = "kombiflow_current_user";
const USERS_DIRECTORY_KEY = "kombiflow_staff_accounts";

// Pre-seeded system accounts
export const SEED_STAFF_ACCOUNTS: AuthUser[] = [
  {
    id: "USR-001",
    fullName: "Operations Director (NRTC HQ)",
    username: "superadmin",
    password: "admin",
    role: "super-admin",
    roleDisplay: "Super Administrator",
    phone: "+268 7611 0001",
    email: "superadmin@transport.gov.sz",
    status: "Active",
    department: "National Road Transportation Council",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    lastLogin: new Date().toISOString()
  },
  {
    id: "USR-002",
    fullName: "Vusi Mabuza",
    username: "vusi_rank_mbabane",
    password: "1234",
    role: "admin",
    roleDisplay: "Rank Administrator",
    phone: "+268 7914 5599",
    email: "vusi.mabuza@nrtc.sz",
    status: "Active",
    department: "Mbabane Central Rank Terminal",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    lastLogin: new Date().toISOString()
  },
  {
    id: "USR-003",
    fullName: "Sindi Vilakati",
    username: "fleet_manager",
    password: "1234",
    role: "fleet-manager",
    roleDisplay: "Fleet Concession Manager",
    phone: "+268 7622 9900",
    email: "sindi.vilakati@fleet.gov.sz",
    status: "Active",
    department: "Ministry of Public Works & Transport",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    lastLogin: new Date().toISOString()
  },
  {
    id: "USR-004",
    fullName: "Inspector J. Cele",
    username: "cele_inspector",
    password: "1234",
    role: "inspector",
    roleDisplay: "Traffic Law Enforcement Officer",
    phone: "+268 7644 8811",
    email: "jcele@police.gov.sz",
    status: "Active",
    badgeNumber: "REPS-MB-4091",
    department: "Royal Eswatini Police Service (Traffic)",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    lastLogin: new Date().toISOString()
  }
];

export const GUEST_COMMUTER_USER: AuthUser = {
  id: "USR-GUEST-COMMUTER",
  fullName: "Commuter (Public Passenger)",
  username: "commuter_guest",
  role: "commuter",
  roleDisplay: "Commuter / Passenger",
  phone: "+268 7600 0000",
  email: "commuter@kombiflow.sz",
  status: "Active",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
};

/**
 * Gather all dynamically synchronized accounts from localStorage, drivers, operators, and staff
 */
export function getAllSystemAccounts(): AuthUser[] {
  // 1. Staff accounts from localStorage
  const savedStaff = getStoredData<any[]>(USERS_DIRECTORY_KEY, SEED_STAFF_ACCOUNTS);
  const normalizedStaff: AuthUser[] = savedStaff.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    username: s.username || s.email?.split("@")[0] || "user",
    password: s.password || "1234",
    role: (s.role?.toLowerCase().includes("super")
      ? "super-admin"
      : s.role?.toLowerCase().includes("fleet")
      ? "fleet-manager"
      : s.role?.toLowerCase().includes("rank") || s.role?.toLowerCase().includes("admin")
      ? "admin"
      : s.role?.toLowerCase().includes("police") || s.role?.toLowerCase().includes("enforce") || s.role?.toLowerCase().includes("inspect")
      ? "inspector"
      : s.role?.toLowerCase().includes("operator")
      ? "operator"
      : "admin") as AuthRole,
    roleDisplay: s.role || s.roleDisplay || "System Administrator",
    phone: s.phone || "+268 7600 0000",
    email: s.email || `${s.username}@transport.gov.sz`,
    status: (s.status === "Suspended" || s.status === "Locked" ? s.status : "Active") as "Active" | "Suspended" | "Locked",
    avatarUrl: s.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    lastLogin: s.lastLogin
  }));

  // Ensure superadmin exists in staff
  if (!normalizedStaff.some((a) => a.username === "superadmin")) {
    normalizedStaff.unshift(SEED_STAFF_ACCOUNTS[0]);
  }

  // 2. Operators from storage
  const savedOperators = getStoredData<FleetOperator[]>("sisonkhe_fleet_operators", INITIAL_OPERATORS);
  const operatorAccounts: AuthUser[] = savedOperators.map((op) => {
    const rawUsername = op.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    // Check if customized in staff accounts
    const override = normalizedStaff.find((s) => s.id === op.id || s.username === rawUsername);
    return {
      id: op.id,
      fullName: op.name,
      username: override?.username || rawUsername,
      password: override?.password || "1234",
      role: "operator" as AuthRole,
      roleDisplay: `Vehicle Owner • ${op.companyName}`,
      phone: override?.phone || op.phone,
      email: override?.email || op.email || `${rawUsername}@transit.co.sz`,
      status: override?.status || "Active",
      operatorId: op.id,
      avatarUrl: op.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      lastLogin: override?.lastLogin || new Date().toISOString()
    };
  });

  // 3. Drivers from storage
  const savedDrivers = getStoredData<Driver[]>("drivers", INITIAL_DRIVERS);
  const driverAccounts: AuthUser[] = savedDrivers.map((drv) => {
    const defaultUsername = drv.username || `${drv.fullName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_drv`;
    return {
      id: drv.id,
      fullName: drv.fullName,
      username: defaultUsername,
      password: drv.password || "1234",
      role: "driver" as AuthRole,
      roleDisplay: `Kombi Driver • Reg ${drv.assignedVehicleReg || "Fleet"}`,
      phone: drv.phone,
      email: `${defaultUsername}@kombiflow.sz`,
      status: drv.status === "Suspended" ? "Suspended" : "Active",
      assignedVehicleReg: drv.assignedVehicleReg,
      assignedRouteId: drv.assignedRoute,
      avatarUrl: drv.profilePictureUrl || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200`,
      lastLogin: new Date().toISOString()
    };
  });

  // Filter out any duplicates by ID or username
  const seenIds = new Set<string>();
  const seenUsernames = new Set<string>();
  const allAccounts: AuthUser[] = [];

  for (const acc of [...normalizedStaff, ...operatorAccounts, ...driverAccounts]) {
    if (!seenIds.has(acc.id) && !seenUsernames.has(acc.username)) {
      seenIds.add(acc.id);
      seenUsernames.add(acc.username);
      allAccounts.push(acc);
    }
  }

  return allAccounts;
}

/**
 * Synchronize an updated user back to its respective data store
 */
export function syncUserUpdate(updatedUser: Partial<AuthUser> & { id: string }): void {
  const all = getAllSystemAccounts();
  const existing = all.find((u) => u.id === updatedUser.id);
  if (!existing) return;

  const merged: AuthUser = { ...existing, ...updatedUser };

  // If driver, update drivers list in storage
  if (merged.role === "driver") {
    const drivers = getStoredData<Driver[]>("drivers", INITIAL_DRIVERS);
    const updatedDrivers = drivers.map((d) => {
      if (d.id === merged.id) {
        return {
          ...d,
          fullName: merged.fullName,
          phone: merged.phone,
          password: merged.password || d.password,
          status: merged.status === "Suspended" ? "Suspended" : "Active"
        };
      }
      return d;
    });
    setStoredData("drivers", updatedDrivers);
    pushServerState({ drivers: updatedDrivers });
  }

  // If operator, update operators list in storage
  if (merged.role === "operator") {
    const ops = getStoredData<FleetOperator[]>("sisonkhe_fleet_operators", INITIAL_OPERATORS);
    const updatedOps = ops.map((op) => {
      if (op.id === merged.id) {
        return {
          ...op,
          name: merged.fullName,
          phone: merged.phone,
          email: merged.email
        };
      }
      return op;
    });
    setStoredData("sisonkhe_fleet_operators", updatedOps);
    pushServerState({ operators: updatedOps });
  }

  // Always update staff directory
  const savedStaff = getStoredData<any[]>(USERS_DIRECTORY_KEY, SEED_STAFF_ACCOUNTS);
  const existingStaffIdx = savedStaff.findIndex((s) => s.id === merged.id);
  if (existingStaffIdx >= 0) {
    savedStaff[existingStaffIdx] = { ...savedStaff[existingStaffIdx], ...merged };
  } else {
    savedStaff.push(merged);
  }
  setStoredData(USERS_DIRECTORY_KEY, savedStaff);
  pushServerState({ staff_accounts: savedStaff });

  // Update current user if modifying self
  const current = getCurrentUser();
  if (current.id === merged.id) {
    setCurrentUser(merged);
  }

  window.dispatchEvent(new CustomEvent("kombiflow_auth_changed", { detail: merged }));
}

/**
 * Get current logged-in user from localStorage, or default to Super Admin for seamless testing
 */
export function getCurrentUser(): AuthUser {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Verify against latest directory state (e.g. if password or status changed)
      const all = getAllSystemAccounts();
      const match = all.find((u) => u.id === parsed.id || u.username === parsed.username);
      if (match) {
        return match;
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error parsing current user:", e);
  }
  // Default to Super Admin so all capabilities are initially visible
  return SEED_STAFF_ACCOUNTS[0];
}

/**
 * Set current logged-in user
 */
export function setCurrentUser(user: AuthUser): void {
  const userWithLogin = {
    ...user,
    lastLogin: new Date().toISOString()
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithLogin));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("kombiflow_auth_changed", { detail: userWithLogin }));
}

/**
 * Authenticate credentials
 */
export function authenticateUser(
  usernameOrPhone: string,
  password: string
): { success: boolean; user?: AuthUser; error?: string } {
  const cleanInput = usernameOrPhone.trim().toLowerCase();
  const all = getAllSystemAccounts();

  const user = all.find((u) => 
    u.username.toLowerCase() === cleanInput || 
    u.phone.replace(/\s+/g, "") === cleanInput.replace(/\s+/g, "") ||
    u.email.toLowerCase() === cleanInput
  );

  if (!user) {
    return {
      success: false,
      error: `No registered account found for "${usernameOrPhone}". Check your username or phone number.`
    };
  }

  if (user.status === "Suspended" || user.status === "Locked") {
    return {
      success: false,
      error: `Access Denied: Account is ${user.status}. Please contact the Super Administrator (NRTC HQ).`
    };
  }

  // Accept password or default bypass "1234" / "admin" if matching
  const expectedPassword = user.password || "1234";
  if (password !== expectedPassword && !(password === "1234" && user.role !== "super-admin")) {
    return {
      success: false,
      error: "Incorrect password or PIN. Please check your credentials and try again."
    };
  }

  // Success
  setCurrentUser(user);
  return { success: true, user };
}

/**
 * Sign out current user and set to Guest Commuter mode
 */
export function logoutUser(): void {
  setCurrentUser(GUEST_COMMUTER_USER);
}

/**
 * Check if the active tab is permitted for the given role
 */
export function isTabAuthorized(tab: string, role: AuthRole): boolean {
  if (role === "super-admin") return true;

  switch (tab) {
    case "kiosk":
    case "departures":
      return true; // accessible to everyone
    case "driver":
      return role === "driver";
    case "operator":
      return role === "operator";
    case "admin":
      return role === "admin" || role === "fleet-manager";
    case "permits":
      return role === "fleet-manager" || role === "admin";
    case "super_admin":
      return false;
    default:
      return true;
  }
}
