/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure utility functions. No side effects, no storage access, no network.
 */

export function generateVIC(reg: string): string {
  if (!reg) return "";
  const cleanReg = reg.toUpperCase().replace(/\s+/g, "");
  const lettersOnly = cleanReg.replace(/[^A-Z]/g, "");
  const digitsOnly = cleanReg.replace(/[^0-9]/g, "");

  let prefix = "";
  if (cleanReg.startsWith("MSD") || cleanReg.includes("MZ")) prefix = "MMZ";
  else if (cleanReg.startsWith("HSD") || cleanReg.includes("BM")) prefix = "HBM";
  else if (cleanReg.startsWith("LSD") || cleanReg.includes("LU")) prefix = "SLU";
  else if (cleanReg.startsWith("SSD") || cleanReg.includes("SH")) prefix = "SNH";
  else if (lettersOnly.length >= 3) {
    prefix = `${lettersOnly.charAt(0)}${lettersOnly.slice(-2)}`;
  } else if (lettersOnly.length > 0) {
    prefix = (lettersOnly + "MZ").slice(0, 3);
  } else {
    prefix = "MMZ";
  }

  const digits =
    digitsOnly.length > 0 ? digitsOnly.padStart(3, "0").slice(-3) : "001";

  return `${prefix}-${digits}`;
}

export function formatVIC(vicOrReg: string): string {
  if (!vicOrReg) return "";
  const clean = vicOrReg.trim().toUpperCase();

  const matchHyphen = clean.match(/^([A-Z]{2,4})-(\d{1,4})$/);
  if (matchHyphen) {
    return `${matchHyphen[1]}-${matchHyphen[2].padStart(3, "0").slice(-3)}`;
  }

  const matchDirect = clean.match(/^([A-Z]{2,4})(\d{1,4})$/);
  if (matchDirect) {
    return `${matchDirect[1]}-${matchDirect[2].padStart(3, "0").slice(-3)}`;
  }

  return generateVIC(clean);
}

export function getRouteCode(origin: string, region: string, bay: string): string {
  const cleanBay = bay.replace(/[^0-9]/g, "");
  const bayNum = cleanBay ? cleanBay.padStart(2, "0") : "01";

  const org = origin.toUpperCase();
  const reg = region.toUpperCase();

  let prefix = "";
  if (org.includes("MBABANE")) prefix = "MB";
  else if (org.includes("MANZINI")) prefix = "MN";
  else if (org.includes("SITEKI")) prefix = "SH";
  else if (org.includes("NHLANGANO")) prefix = "NH";
  else prefix = (org.charAt(0) + (reg.charAt(0) || "X")).slice(0, 2);

  return prefix + bayNum;
}

export function calculateDaysRemaining(expiryDateStr: string | undefined): number {
  if (!expiryDateStr) return 999;
  const today = new Date();
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
