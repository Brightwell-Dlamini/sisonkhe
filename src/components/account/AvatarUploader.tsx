/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Square avatar uploader. Writes through /api/account/avatar.
 * After success, updates the auth store so every avatar in the shell
 * (AccountHeader, UserMenu, etc.) reflects the change immediately.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Props {
  size?: number; // px, default 96
  className?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader({ size = 96, className }: Props) {
  const { user, setUser } = useAuthStore();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "uploading" | "deleting">("idle");
  const [dragOver, setDragOver] = useState(false);

  const initials = (user?.fullName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const url = user?.avatarUrl;

  const upload = useCallback(
    async (file: File) => {
      if (!user) return;
      if (!ALLOWED.includes(file.type)) {
        toast.error("Only JPEG, PNG, WebP or GIF images are allowed.");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`Image is too large (${Math.round(file.size / 1024)} KB). Max 5 MB.`);
        return;
      }

      setBusy("uploading");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/account/avatar", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        // Optimistically update the whole app
        setUser({ ...user, avatarUrl: data.url as string });
        toast.success("Profile picture updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy("idle");
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [user, setUser, toast]
  );

  const clear = useCallback(async () => {
    if (!user || !user.avatarUrl) return;
    setBusy("deleting");
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUser({ ...user, avatarUrl: undefined });
      toast.success("Profile picture removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusy("idle");
    }
  }, [user, setUser, toast]);

  if (!user) return null;

  const working = busy !== "idle";

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!working) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (working) return;
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
      >
        {/* Ambient glow matching the AccountHeader style */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 blur-md opacity-40" />

        {/* The avatar itself */}
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={user.fullName}
            className={cn(
              "relative h-full w-full rounded-2xl object-cover ring-2 ring-white/10 transition",
              working && "opacity-60"
            )}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className={cn(
              "relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-2xl font-black text-black ring-2 ring-white/10 transition",
              working && "opacity-60"
            )}
          >
            {initials}
          </div>
        )}

        {/* Hover / drag overlay */}
        <button
          type="button"
          onClick={() => !working && inputRef.current?.click()}
          disabled={working}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider transition-opacity",
            "opacity-0 hover:opacity-100 focus-visible:opacity-100",
            dragOver && "opacity-100 ring-2 ring-emerald-400",
            working && "opacity-100 cursor-wait"
          )}
        >
          {working ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{busy === "uploading" ? "Uploading" : "Removing"}</span>
            </>
          ) : (
            <>
              <Camera className="h-5 w-5" />
              <span>{dragOver ? "Drop to upload" : "Change photo"}</span>
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={working}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>

      {/* Small action row under the avatar */}
      <div className="flex items-center gap-1.5 text-[10px]">
        <button
          type="button"
          onClick={() => !working && inputRef.current?.click()}
          disabled={working}
          className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-50"
        >
          <Upload className="h-3 w-3" />
          Upload
        </button>
        {url && (
          <button
            type="button"
            onClick={() => void clear()}
            disabled={working}
            className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 font-bold uppercase tracking-wider text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      <p className="text-[10px] text-zinc-500">
        Square image · JPEG, PNG, WebP or GIF · max 5 MB
      </p>
    </div>
  );
}
