/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /staff — universal staff sign-in entry point.
 *
 * Anyone can bookmark this URL. It always takes them to the sign-in page,
 * which then routes them to their correct dashboard by role.
 */

import { redirect } from "next/navigation";

export default function StaffRedirect() {
  redirect("/login");
}
