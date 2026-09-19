/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { redirect } from "next/navigation";

export default function AdminIndex() {
  redirect("/admin/staff");
}
