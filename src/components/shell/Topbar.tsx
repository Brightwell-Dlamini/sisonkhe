"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { ResolvedUser } from "@/lib/auth/roles";
import type { Role, NavGroup } from "@/config/navigation";
import { findActiveItem } from "@/lib/navigation/resolve";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";
import SyncStatusPill from "@/components/offline/SyncStatusPill";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";

interface Props {
  user: ResolvedUser;
  role: Role;
  groups: NavGroup[];
  onOpenMobileNav: () => void;
}

export default function Topbar({
  user,
  role,
  groups,
  onOpenMobileNav,
}: Props) {
  const pathname = usePathname();
  const active = findActiveItem(pathname, groups);

  return (
    <header className="h-14 shrink-0 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] touch-manipulation"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="text-[11px] font-medium text-zinc-500 truncate">
            {active ? "Sisonkhe" : "Sisonkhe · in transit"}
          </div>
          <h1 className="text-[15px] font-semibold text-white tracking-tight truncate leading-tight">
            {active?.label ?? "Dashboard"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <LocaleSwitcher className="hidden sm:inline-flex mr-0.5" />
        <SyncStatusPill />
        <NotificationsMenu />
        <div className="w-px h-5 bg-white/[0.08] mx-1.5" />
        <UserMenu user={user} role={role} />
      </div>
    </header>
  );
}
