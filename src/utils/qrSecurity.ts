/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getVehicleQRUrl(vehicle: {
    registrationNumber?: string | null;
    permitNumber?: string | null;
    vic?: string | null;
}): string {
    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    const plate = String(vehicle.registrationNumber ?? "unknown").trim();
    return `${baseUrl}/verify?plate=${encodeURIComponent(plate)}`;
}
