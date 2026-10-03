"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { navForRole, toRole, homeRouteForRole } from "@/lib/navigation/resolve";
import OfflineBanner from "@/components/offline/OfflineBanner";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileDrawer from "./MobileDrawer";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function AppShell({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login with redirect param
    if (typeof window !== "undefined") {
      const redirect = encodeURIComponent(window.location.pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
    return null;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their home
    const role = toRole(user.role);
    router.replace(homeRouteForRole(role));
    return null;
  }

  const role = toRole(user.role);
  const groups = navForRole(role);

  return (
    <div className="min-h-screen flex bg-[#0A0A0A] text-white">
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <div className="sticky top-0 h-screen">
          <Sidebar
            groups={groups}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
          />
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={mobileOpen}
        groups={groups}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <OfflineBanner />
        <Topbar
          user={user}
          role={role}
          groups={groups}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="flex-1 min-w-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
