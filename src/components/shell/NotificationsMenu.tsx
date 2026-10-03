"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";

interface Notif {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications?limit=10")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => {
        setNotifs(
          (d.notifications ?? []).map((n: any) => ({
            id: n.id,
            message: n.message,
            timestamp: n.timestamp,
            read: false,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-300">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={() => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))}
                className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center font-mono text-[11px] text-zinc-500">
                Loading…
              </div>
            ) : notifs.length === 0 ? (
              <div className="p-6 text-center font-mono text-[11px] text-zinc-500">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-xs ${
                      n.read ? "opacity-60" : "bg-white/[0.02]"
                    }`}
                  >
                    <div className="text-zinc-200 line-clamp-2">{n.message}</div>
                    <div className="font-mono text-[10px] text-zinc-500 mt-1">
                      {new Date(n.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
