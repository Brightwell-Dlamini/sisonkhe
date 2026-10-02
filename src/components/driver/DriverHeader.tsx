"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, LogOut } from "lucide-react";
import type { DriverContext } from "@/lib/driver/queries";

interface Props {
  context: DriverContext;
  onPhotoUploaded: () => void;
}

export default function DriverHeader({ context, onPhotoUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be under 2MB");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/driver/photo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onPhotoUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <header className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-blue-500/40 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  (context as any).profilePictureUrl ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(context.fullName)}&background=3b82f6&color=fff&size=128`
                }
                alt={context.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md"
              title="Upload photo"
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Driver Cab
            </span>
            <h1 className="text-lg font-black text-zinc-900 dark:text-white">
              {context.fullName}
            </h1>
            <div className="text-xs text-zinc-500 font-mono mt-0.5">
              {context.phone}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600">{error}</div>
        )}
      </div>
    </header>
  );
}
