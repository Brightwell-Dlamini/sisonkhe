/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rank fee / system config — super-admin only.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import RankFeeConfig from "@/components/admin/RankFeeConfig";

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "super-admin") {
      router.replace("/admin");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (user.role !== "super-admin") return null;

  return <RankFeeConfig />;
}
