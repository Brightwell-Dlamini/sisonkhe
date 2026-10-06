"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { navForRole, homeRouteForRole } from "@/lib/navigation/resolve";
import type { AuthRole } from "@/lib/auth/roles";
import OfflineBanner from "@/components/offline/OfflineBanner";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileDrawer from "./MobileDrawer";
import { ToastProvider } from "@/components/ui";

interface Props {
  children: React.ReactNode;
  /**
   * Roles allowed in this shell. Pass an AuthRole[] literal — TypeScript
   * rejects typos at compile time.
   */
  allowedRoles?: AuthRole[];
}

export default function AppShell({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleAllowed = useMemo(() => {
    if (!user) return false;
    if (!allowedRoles) return true;
    return allowedRoles.includes(user.role);
  }, [user, allowedRoles]);

  // Redirect logic in an effect — never during render.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirect = encodeURIComponent(window.location.pathname);
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (!roleAllowed) {
      router.replace(homeRouteForRole(user.role));
    }
  }, [loading, user, roleAllowed, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user || !roleAllowed) return null;

  const groups = navForRole(user.role);

  return (
    <ToastProvider>
      <div className="min-h-screen flex bg-[#0A0A0A] text-white">
        <div className="hidden lg:block shrink-0">
          <div className="sticky top-0 h-screen">
            <Sidebar
              groups={groups}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed(!collapsed)}
            />
          </div>
        </div>

        <MobileDrawer
          open={mobileOpen}
          groups={groups}
          onClose={() => setMobileOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <OfflineBanner />
          <Topbar
            user={user}
            role={user.role}
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
    </ToastProvider>
  );
}
