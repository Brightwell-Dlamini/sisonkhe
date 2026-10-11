"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  variant: Variant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  show: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: "border-emerald-500/25 bg-emerald-950/40",
  error: "border-rose-500/25 bg-rose-950/40",
  warning: "border-amber-500/25 bg-amber-950/40",
  info: "border-sky-500/25 bg-sky-950/40",
};

const ICON_COLOR = {
  success: "text-emerald-400",
  error: "text-rose-400",
  warning: "text-amber-400",
  info: "text-sky-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    const duration = t.duration ?? 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value: ToastContextValue = {
    show,
    success: (title, description) =>
      show({ variant: "success", title, description }),
    error: (title, description) =>
      show({ variant: "error", title, description }),
    warning: (title, description) =>
      show({ variant: "warning", title, description }),
    info: (title, description) => show({ variant: "info", title, description }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto border rounded-xl shadow-2xl p-3.5 flex items-start gap-3 ui-enter bg-[#0F0F10]/95 backdrop-blur-md",
                STYLES[t.variant]
              )}
            >
              <Icon
                className={cn("w-4 h-4 shrink-0 mt-0.5", ICON_COLOR[t.variant])}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                {t.description && (
                  <div className="text-[13px] text-zinc-400 mt-0.5 leading-relaxed">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
