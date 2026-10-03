"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { NavGroup } from "@/config/navigation";
import Sidebar from "./Sidebar";

interface Props {
  open: boolean;
  groups: NavGroup[];
  onClose: () => void;
}

export default function MobileDrawer({ open, groups, onClose }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full z-50 transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
          <Sidebar groups={groups} mobile onNavigate={onClose} />
        </div>
      </div>
    </>
  );
}
