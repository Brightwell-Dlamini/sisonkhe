/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Batch permit HTML — one permit per A4 sheet, page-broken.
 */

import "server-only";
import QRCode from "qrcode";
import type { PermitDocument } from "./permit";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function renderQrSvg(data: string, size: number): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

async function renderSinglePermit(doc: PermitDocument): Promise<string> {
  const qrSvg = await renderQrSvg(doc.signedQrToken, 200);

  return `
<div class="page">
  <div class="permit">
    <header class="permit-header">
      <div class="kingdom">${esc(doc.kingdomTitle)}</div>
      <h1 class="ministry">${esc(doc.ministryTitle)}</h1>
      <div class="board">${esc(doc.boardTitle)}</div>
      <div class="doc-title">${esc(doc.documentTitle)}</div>
      <div class="legal-ref">Issued under the Provisions of the Road Transportation Act of 1974 and National Passenger Regulations</div>
    </header>

    <section class="identity-strip">
      <div class="field"><span class="label">Permit Serial No.</span><strong class="value mono">${esc(doc.permitNumber)}</strong></div>
      <div class="field"><span class="label">Registration Plate</span><strong class="value mono">${esc(doc.registrationNumber)}</strong></div>
      <div class="field"><span class="label">Fleet VIC</span><strong class="value mono">${esc(doc.vic)}</strong></div>
    </section>

    <section class="permit-body">
      <div class="left-column">
        <div class="section">
          <div class="section-title">1. Authorized Operator</div>
          <div class="grid-2">
            <div class="pair"><strong>Operator / Owner:</strong> ${esc(doc.operatorName)}</div>
            <div class="pair"><strong>Contact:</strong> ${esc(doc.operatorPhone)}</div>
            <div class="pair col-span-2"><strong>Association:</strong> ${esc(doc.association)}</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">2. Commercial Vehicle Particulars</div>
          <div class="grid-2">
            <div class="pair"><strong>Make &amp; Model:</strong> ${esc(doc.make)} ${esc(doc.model)}</div>
            <div class="pair"><strong>Classification:</strong> ${esc(doc.classification)}</div>
            <div class="pair"><strong>Seating Capacity:</strong> ${esc(doc.seatingCapacity)} passengers</div>
            <div class="pair"><strong>Loading Bay:</strong> ${esc(doc.loadingBay)}</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">3. Authorized Corridor Route</div>
          <div class="pair"><strong>Route:</strong> ${esc(doc.routeOrigin)} → ${esc(doc.routeDestination)} (${esc(doc.routeRegion)} Region)</div>
        </div>
        <div class="section">
          <div class="section-title">4. Statutory Compliance</div>
          <div class="grid-2">
            <div class="pair"><strong>Fitness (COF):</strong> ${esc(doc.cofNumber)}</div>
            <div class="pair"><strong>COF Expiry:</strong> ${esc(doc.cofExpiryDate)}</div>
            <div class="pair"><strong>Assigned Driver:</strong> ${esc(doc.driverName)}</div>
            <div class="pair"><strong>Driver PDP Status:</strong> ${esc(doc.driverPdpStatus)}</div>
            <div class="pair col-span-2"><strong>Last Inspection:</strong> ${esc(doc.lastInspectionDate)}</div>
          </div>
        </div>
      </div>

      <aside class="right-column">
        <div class="qr-block">
          <div class="qr-label">Official Cryptographic QR</div>
          <div class="qr-frame">${qrSvg}</div>
          <div class="qr-caption">Scan via Eswatini Police, Road Safety Officers &amp; Commuter Kiosks</div>
        </div>
        <div class="validity-block">
          <div class="validity-row"><span class="label">Issue Date</span><strong class="mono">${esc(doc.permitIssueDate)}</strong></div>
          <div class="validity-row"><span class="label">Expiry Date</span><strong class="mono highlight">${esc(doc.permitExpiryDate)}</strong></div>
          <div class="validity-row"><span class="label">Status</span><strong class="mono">${esc(doc.permitStatus)}</strong></div>
        </div>
      </aside>
    </section>

    <footer class="permit-footer">
      <div class="conditions">
        <div class="conditions-title">Statutory Conditions:</div>
        <ol>
          <li>This permit must be carried in the designated vehicle at all times and presented on demand to authorized officers.</li>
          <li>The vehicle must undergo mandatory bi-annual Certificate of Fitness inspections.</li>
          <li>Overloading beyond registered passenger capacity constitutes immediate grounds for permit suspension.</li>
          <li>Unauthorized route deviation is a prosecutable offense under the Road Transportation Act.</li>
          <li>This permit is non-transferable and remains valid only for the assigned corridor and operator.</li>
        </ol>
      </div>
      <div class="signature">
        <div class="sig-line"></div>
        <div class="sig-title">Chairman, Road Transportation Board</div>
        <div class="sig-sub">Kingdom of Eswatini</div>
        <div class="auth-hash"><span class="mono">AUTH-RTB-${esc(doc.permitNumber).replace(/\W/g, "")}</span></div>
      </div>
    </footer>

    <div class="print-meta">Printed ${esc(doc.printTimestamp)} • Verify at ${esc(doc.verifyUrl)}</div>
  </div>
</div>
`;
}

export async function renderBatchPermitHtml(
  docs: PermitDocument[]
): Promise<string> {
  const bodies = await Promise.all(docs.map(renderSinglePermit));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Permit Batch (${docs.length})</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .page { width: 210mm; min-height: 297mm; padding: 12mm; margin: 8mm auto; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); position: relative; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .permit { border: 3px double #065f46; border-radius: 6px; padding: 10mm 8mm; height: 100%; display: flex; flex-direction: column; }
  .permit-header { text-align: center; padding-bottom: 4mm; border-bottom: 2px solid #065f46; }
  .kingdom { font-size: 9pt; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #065f46; }
  .ministry { font-size: 16pt; font-weight: 900; text-transform: uppercase; color: #111; margin-top: 2mm; }
  .board { font-size: 10pt; font-weight: 700; text-transform: uppercase; color: #333; margin-top: 1mm; }
  .doc-title { font-size: 10pt; font-weight: 900; text-transform: uppercase; color: #065f46; margin-top: 3mm; letter-spacing: 0.05em; }
  .legal-ref { font-size: 7pt; color: #666; margin-top: 2mm; font-style: italic; }
  .identity-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; padding: 4mm; margin-top: 4mm; background: #f0fdf4; border: 1px solid #065f46; border-radius: 3px; }
  .identity-strip .field { text-align: center; }
  .identity-strip .label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.08em; color: #666; font-weight: 700; display: block; }
  .identity-strip .value { font-size: 12pt; font-weight: 900; color: #065f46; }
  .permit-body { display: grid; grid-template-columns: 1fr 70mm; gap: 6mm; margin-top: 5mm; flex: 1; }
  .left-column { display: flex; flex-direction: column; gap: 4mm; }
  .section { border-bottom: 1px dashed #d4d4d8; padding-bottom: 3mm; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #065f46; margin-bottom: 2mm; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; }
  .pair { font-size: 9pt; color: #333; line-height: 1.4; }
  .pair strong { color: #111; }
  .pair.col-span-2 { grid-column: span 2; }
  .right-column { display: flex; flex-direction: column; gap: 4mm; }
  .qr-block { text-align: center; padding: 3mm; border: 1px solid #d4d4d8; border-radius: 3px; background: #fafafa; }
  .qr-label { font-size: 7pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #065f46; margin-bottom: 2mm; }
  .qr-frame { width: 60mm; height: 60mm; margin: 0 auto; background: #fff; padding: 1mm; border: 1px solid #d4d4d8; border-radius: 3px; }
  .qr-frame svg { width: 100%; height: 100%; display: block; }
  .qr-caption { font-size: 6.5pt; color: #666; margin-top: 2mm; line-height: 1.3; }
  .validity-block { border: 1px solid #d4d4d8; border-radius: 3px; padding: 3mm; background: #fafafa; font-size: 8.5pt; }
  .validity-row { display: flex; justify-content: space-between; align-items: center; padding: 1.5mm 0; border-bottom: 1px solid #e5e5e5; }
  .validity-row:last-child { border-bottom: none; }
  .validity-row .label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.06em; color: #666; font-weight: 700; }
  .validity-row .mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-weight: 700; color: #111; }
  .validity-row .highlight { color: #065f46; }
  .permit-footer { display: grid; grid-template-columns: 2fr 1fr; gap: 6mm; margin-top: 6mm; padding-top: 4mm; border-top: 2px solid #065f46; }
  .conditions-title { font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: #111; margin-bottom: 1.5mm; }
  .conditions ol { padding-left: 5mm; font-size: 7.5pt; line-height: 1.4; color: #444; }
  .conditions li { margin-bottom: 1mm; }
  .signature { display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-end; text-align: right; }
  .sig-line { width: 55mm; border-bottom: 1px solid #111; height: 12mm; }
  .sig-title { font-size: 8pt; font-weight: 900; text-transform: uppercase; margin-top: 1.5mm; }
  .sig-sub { font-size: 7pt; color: #666; }
  .auth-hash { margin-top: 3mm; font-size: 7pt; color: #888; }
  .print-meta { position: absolute; bottom: 4mm; left: 8mm; right: 8mm; text-align: center; font-size: 6pt; color: #999; font-family: ui-monospace, monospace; }

  .toolbar { max-width: 210mm; margin: 4mm auto; display: flex; justify-content: flex-end; gap: 2mm; }
  .toolbar button { padding: 8px 16px; background: #065f46; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }

  @media print {
    html, body { background: #fff; }
    .page { box-shadow: none; margin: 0; padding: 10mm; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>
<div class="toolbar no-print">
  <button onclick="window.print()">Print All (${docs.length})</button>
</div>
${bodies.join("")}
</body>
</html>`;
}
