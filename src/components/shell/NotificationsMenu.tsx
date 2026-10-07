"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";

interface Notif {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  href: string | null;
  read: boolean;
  type: string;
}

export default function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const d = await res.json();
      setNotifs(
        (d.notifications ?? []).map(
          (n: {
            id: string;
            title?: string;
            message: string;
            timestamp: string;
            href?: string | null;
            read?: boolean;
            type?: string;
          }) => ({
            id: n.id,
            title: n.title || "Update",
            message: n.message,
            timestamp: n.timestamp,
            href: n.href ?? null,
            read: !!n.read,
            type: n.type ?? "system",
          })
        )
      );
      setUnread(Number(d.unread ?? 0));
    } catch {
      /* ignore */
    }
  }, []);

  // Badge poll while shell is open
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 45_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      /* */
    }
  }

  async function openNotif(n: Notif) {
    if (!n.read) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id }),
        });
        setNotifs((ns) =>
          ns.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* */
      }
    }
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-300">
              Notifications{unread > 0 ? ` · ${unread}` : ""}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 flex justify-center text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="p-6 text-center font-mono text-[11px] text-zinc-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void openNotif(n)}
                    className={`w-full text-left p-3 text-xs hover:bg-white/[0.04] transition-colors ${
                      n.read ? "opacity-55" : "bg-white/[0.02]"
                    }`}
                  >
                    <div className="font-bold text-zinc-100 text-[11px]">
                      {n.title}
                    </div>
                    <div className="text-zinc-300 line-clamp-2 mt-0.5">
                      {n.message}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500 mt-1">
                      {new Date(n.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
