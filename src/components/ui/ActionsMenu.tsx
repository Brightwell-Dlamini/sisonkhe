/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal-rendered dropdown menu.
 *
 * The trigger button stays in place; the menu is mounted into document.body
 * with position:fixed, positioned from the trigger's bounding rect. This
 * escapes any overflow-hidden / overflow-auto ancestor (tables, cards, etc).
 *
 * Features:
 *   - Auto-flips up if not enough space below
 *   - Right-aligns to trigger's right edge (or left-aligns if no room)
 *   - Closes on: outside click, Escape, route change, scroll, resize
 *   - Recomputes position on scroll/resize while open
 *   - Focuses the first item on open
 */

"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionsMenuItem {
  key: string;
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  /** Render a divider line above this item. */
  dividerBefore?: boolean;
}

interface Props {
  items: ActionsMenuItem[];
  /** Optional explicit trigger; defaults to a MoreVertical icon button. */
  trigger?: React.ReactNode;
  /** Accessible label for the default trigger. */
  label?: string;
  /** Horizontal alignment of the menu relative to the trigger. */
  align?: "start" | "end";
  /** Minimum menu width in px. */
  minWidth?: number;
  /** Optional className applied to the menu container. */
  className?: string;
  /** Optional className applied to the default trigger button. */
  triggerClassName?: string;
  /** Disable opening the menu. */
  disabled?: boolean;
}

interface Position {
  top: number;
  left: number;
  placement: "bottom" | "top";
  ready: boolean;
}

const MENU_GAP = 6; // px between trigger and menu
const VIEWPORT_PAD = 8; // px from viewport edge

export function ActionsMenu({
  items,
  trigger,
  label = "More actions",
  align = "end",
  minWidth = 180,
  className,
  triggerClassName,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Position>({
    top: 0,
    left: 0,
    placement: "bottom",
    ready: false,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // SSR guard for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // ---- positioning ----
  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    const menu = menuRef.current;
    if (!el || !menu) return;

    const rect = el.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const menuHeight = menuRect.height || 200;
    const menuWidth = menuRect.width || minWidth;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // vertical — prefer below, flip above if not enough room
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const wantBelow = spaceBelow >= menuHeight + MENU_GAP + VIEWPORT_PAD;
    const wantAbove = spaceAbove >= menuHeight + MENU_GAP + VIEWPORT_PAD;

    let placement: "bottom" | "top" = "bottom";
    if (!wantBelow && wantAbove) placement = "top";
    else if (!wantBelow && !wantAbove) {
      // Not enough either side — pick the side with more space
      placement = spaceBelow >= spaceAbove ? "bottom" : "top";
    }

    const top =
      placement === "bottom"
        ? rect.bottom + MENU_GAP
        : rect.top - menuHeight - MENU_GAP;

    // horizontal — align to trigger's start or end edge
    let left =
      align === "end" ? rect.right - menuWidth : rect.left;

    // clamp to viewport
    if (left + menuWidth > vw - VIEWPORT_PAD) {
      left = vw - menuWidth - VIEWPORT_PAD;
    }
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

    // clamp vertical to viewport (avoid going off the top)
    const clampedTop = Math.max(
      VIEWPORT_PAD,
      Math.min(top, vh - menuHeight - VIEWPORT_PAD)
    );

    setPos({ top: clampedTop, left, placement, ready: true });
  }, [align, minWidth]);

  // On open: measure and position before paint
  useLayoutEffect(() => {
    if (!open) return;
    setPos((p) => ({ ...p, ready: false }));
    // double rAF ensures the menu has laid out and we can measure it
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        computePosition();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, computePosition]);

  // Recompute on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const handler = () => computePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, computePosition]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Focus first enabled item on open
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>(
      'button[role="menuitem"]:not([disabled])'
    );
    first?.focus();
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    setOpen((v) => !v);
  };

  // Default trigger
  const defaultTrigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={toggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors",
        "w-8 h-8",
        disabled && "opacity-40 pointer-events-none",
        triggerClassName
      )}
    >
      <MoreVertical className="w-4 h-4" />
    </button>
  );

  return (
    <>
      {trigger ? (
        <span
          onClick={toggle}
          className="inline-flex"
          ref={(el) => {
            // Capture the first button inside a custom trigger
            triggerRef.current = el?.querySelector("button") ?? null;
          }}
        >
          {trigger}
        </span>
      ) : (
        defaultTrigger
      )}

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth,
              visibility: pos.ready ? "visible" : "hidden",
            }}
            className={cn(
              "z-[100] rounded-xl bg-[#0F0F10] border border-white/[0.08] shadow-2xl py-1",
              "animate-in fade-in-0 zoom-in-95 duration-100",
              className
            )}
          >
            {items.map((item) => (
              <div key={item.key}>
                {item.dividerBefore && (
                  <div className="my-1 h-px bg-white/[0.06]" role="separator" />
                )}
                <button
                  role="menuitem"
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors",
                    item.tone === "danger"
                      ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      : "text-zinc-300 hover:text-white hover:bg-white/[0.06]",
                    item.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {item.icon && <item.icon className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
