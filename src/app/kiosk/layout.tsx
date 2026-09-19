/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal layout for the standalone kiosk. No nav, no auth, no chrome.
 * Designed to be embedded on a TV or public display.
 */

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505]">
      {children}
    </div>
  );
}
