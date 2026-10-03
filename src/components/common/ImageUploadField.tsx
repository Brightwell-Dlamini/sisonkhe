/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Image field with file upload + optional URL paste.
 */

"use client";

import { useRef, useState } from "react";
import { Upload, Link2, Loader2, X, ImageIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  folder = "general",
  required = false,
  error,
  helpText,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }
      onChange(data.url as string);
    } catch {
      setUploadError("Network error during upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
        >
          <Link2 className="w-3 h-3" />
          {showUrl ? "Hide URL" : "Paste URL instead"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-20 h-20 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-zinc-300" />
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1 right-1 p-0.5 rounded-md bg-black/60 text-white"
              title="Clear"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <label
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border transition ${
              uploading
                ? "opacity-60 border-zinc-200 dark:border-zinc-700"
                : "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70"
            }`}
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploading ? "Uploading\u2026" : "Upload image file"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-[10px] text-zinc-500">
            {helpText || "JPEG, PNG, WebP or GIF \u00b7 max 5 MB"}
          </p>
        </div>
      </div>

      {showUrl && (
        <input
          type="url"
          value={value}
          required={required && !value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://\u2026"
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white"
        />
      )}

      {(error || uploadError) && (
        <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">
          {error || uploadError}
        </p>
      )}
    </div>
  );
}
