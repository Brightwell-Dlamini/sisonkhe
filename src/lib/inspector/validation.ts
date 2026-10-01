/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from "zod";

export const OFFENCE_TYPES = [
  "Speeding",
  "Overloading",
  "Expired Permit",
  "Unroadworthy Vehicle",
  "No Public Liability Cover",
  "Illegal Picking/Dropping",
  "Other",
] as const;

export const createTicketSchema = z.object({
  vehicleReg: z.string().trim().min(1, "Vehicle registration is required").toUpperCase(),
  offenseType: z.enum(OFFENCE_TYPES),
  amountSzl: z.coerce
    .number()
    .min(0, "Amount must be zero or greater")
    .max(10000, "Amount is too large"),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
