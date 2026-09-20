/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bypasses the app layout — print routes return raw HTML.
 */

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
