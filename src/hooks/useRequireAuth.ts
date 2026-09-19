/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import type { AuthRole } from "../lib/auth/roles";

/**
 * Redirects to /login if unauthenticated. Redirects to / if role doesn't match.
 */
export function useRequireAuth(allowedRoles?: AuthRole[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace("/");
    }
  }, [loading, user, allowedRoles, router]);

  return { user, loading };
}
