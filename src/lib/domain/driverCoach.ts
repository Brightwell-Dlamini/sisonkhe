/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver Coach — pure decision layer for cab-side signals.
 * Signals are intents to the marshal, not status writes.
 * Answers: what should I tell the rank right now?
 */

export type DriverSignalKind =
  | "ready"
  | "loading"
  | "cabin_full"
  | "request_depart"
  | "delayed"
  | "breakdown"
  | "back_at_rank";

export type DriverCoachInput = {
  status: string;
  currentQueuePosition: number;
  hasVehicle: boolean;
  routeOrigin?: string | null;
  routeDestination?: string | null;
};

export type DriverCoach = {
  primary: DriverSignalKind | null;
  primaryLabel: string;
  primaryHint: string | null;
  secondary: DriverSignalKind[];
  coachLine: string;
  isLead: boolean;
  canSignal: boolean;
};

const LABELS: Record<DriverSignalKind, string> = {
  ready: "Ready at bay",
  loading: "Boarding",
  cabin_full: "Cabin full",
  request_depart: "Request depart",
  delayed: "Delayed",
  breakdown: "Breakdown",
  back_at_rank: "Back at rank",
};

/**
 * Which signals make sense for this rank status.
 * Everything else is noise on a busy driver phone.
 */
function allowedForStatus(status: string): DriverSignalKind[] {
  switch (status) {
    case "Waiting":
      return ["ready", "delayed", "breakdown"];
    case "Loading":
      return ["cabin_full", "request_depart", "delayed", "breakdown"];
    case "Delayed":
      return ["ready", "breakdown"];
    case "Departed":
      return ["back_at_rank", "breakdown"];
    case "Breakdown":
      return ["back_at_rank"];
    default:
      return ["ready", "delayed", "breakdown"];
  }
}

export function driverCoach(input: DriverCoachInput): DriverCoach {
  if (!input.hasVehicle) {
    return {
      primary: null,
      primaryLabel: "No vehicle",
      primaryHint: null,
      secondary: [],
      coachLine: "No vehicle assigned — contact fleet manager.",
      isLead: false,
      canSignal: false,
    };
  }

  const status = input.status || "Waiting";
  const isLead = input.currentQueuePosition === 1;
  const allowed = allowedForStatus(status);
  const route =
    input.routeOrigin && input.routeDestination
      ? `${input.routeOrigin} to ${input.routeDestination}`
      : null;

  let primary: DriverSignalKind | null = null;
  let coachLine: string;
  let primaryHint: string | null = null;

  switch (status) {
    case "Waiting":
      primary = "ready";
      if (isLead) {
        coachLine = route
          ? `You are lead for ${route}. Tell the marshal you are ready.`
          : "You are lead. Signal ready so the marshal can start loading.";
        primaryHint = "Marshal can start your load";
      } else if (input.currentQueuePosition > 1) {
        coachLine = `Queue #${input.currentQueuePosition}. Signal ready when you arrive at the bay.`;
        primaryHint = "I’m at the bay";
      } else {
        coachLine = "Not in queue yet. Signal ready when you arrive at the rank.";
        primaryHint = "I’ve arrived";
      }
      break;

    case "Loading":
      primary = "cabin_full";
      coachLine = route
        ? `Boarding for ${route}. When full, ask the marshal to depart.`
        : "Boarding in progress. When cabin is full, signal the marshal.";
      primaryHint = "Request dispatch";
      break;

    case "Delayed":
      primary = "ready";
      coachLine = "You are marked delayed. Signal ready when you can load again.";
      primaryHint = "Clear to continue";
      break;

    case "Departed":
      primary = "back_at_rank";
      coachLine = "On the road. When you return to the terminal, signal back at rank.";
      primaryHint = "I’m back";
      break;

    case "Breakdown":
      primary = "back_at_rank";
      coachLine = "Breakdown logged. Signal back at rank after repair or recovery.";
      primaryHint = null;
      break;

    default:
      primary = allowed[0] ?? null;
      coachLine = `Status: ${status}. Use signals only when they match the rank.`;
  }

  // Primary must be allowed
  if (primary && !allowed.includes(primary)) {
    primary = allowed[0] ?? null;
  }

  const secondary = allowed.filter((k) => k !== primary);

  return {
    primary,
    primaryLabel: primary ? LABELS[primary] : "—",
    primaryHint,
    secondary,
    coachLine,
    isLead,
    canSignal: allowed.length > 0,
  };
}

export function signalLabel(kind: DriverSignalKind): string {
  return LABELS[kind];
}
