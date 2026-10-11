/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Share "Send Access" invite — claim link primary, password fallback.
 */

"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  MessageCircle,
  Link2,
} from "lucide-react";

interface Props {
  fullName: string;
  username: string;
  claimUrl?: string | null;
  password?: string | null;
  expiresAt?: string | null;
  roleLabel?: string;
  /** Dialog title — default rank-friendly "Access sent" */
  title?: string;
  onClose: () => void;
}

export default function ClaimLinkDialog({
  fullName,
  username,
  claimUrl,
  password,
  expiresAt,
  roleLabel = "user",
  title = "Access sent",
  onClose,
}: Props) {
  const [copied, setCopied] = useState<
    "link" | "user" | "pass" | "msg" | null
  >(null);

  const copy = (text: string, tag: typeof copied) => {
    void navigator.clipboard.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(null), 2000);
  };

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleString()
    : null;

  const shareMessage = claimUrl
    ? `Sisonkhe access for ${fullName}\n\nUsername: ${username}\nOpen this link to set your password${expiryLabel ? ` (expires ${expiryLabel})` : ""}:\n${claimUrl}`
    : `Sisonkhe access\nUsername: ${username}\nPassword: ${password ?? ""}`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white">{title}</h3>
              <p className="text-[11px] text-zinc-500">
                {fullName} · {roleLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3 text-xs text-emerald-100 flex items-start gap-2">
          <Link2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>
            {claimUrl ? (
              <>
                Share the <strong>access link</strong> only. {fullName} opens it,
                sets their own password, and signs in.
                {expiryLabel && (
                  <>
                    {" "}
                    Link expires <strong>{expiryLabel}</strong>.
                  </>
                )}
              </>
            ) : (
              <>
                Access links need the login_claim_tokens migration. Showing a
                one-time password instead.
              </>
            )}
          </span>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
            Username
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-white break-all">
              {username}
            </code>
            <button
              type="button"
              onClick={() => copy(username, "user")}
              className="p-1.5 rounded-lg bg-[#0F0F10] border border-white/[0.06] text-zinc-400 hover:text-emerald-500"
            >
              {copied === "user" ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {claimUrl && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
              Access link
            </div>
            <div className="flex items-start justify-between gap-2">
              <code className="text-[11px] font-mono text-emerald-300 break-all leading-snug">
                {claimUrl}
              </code>
              <button
                type="button"
                onClick={() => copy(claimUrl, "link")}
                className="p-1.5 rounded-lg bg-[#0F0F10] border border-white/[0.06] text-zinc-400 hover:text-emerald-500 shrink-0"
              >
                {copied === "link" ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {!claimUrl && password && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
              Temporary password
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono font-bold text-white break-all">
                {password}
              </code>
              <button
                type="button"
                onClick={() => copy(password, "pass")}
                className="p-1.5 rounded-lg bg-[#0F0F10] border border-white/[0.06] text-zinc-400 hover:text-emerald-500"
              >
                {copied === "pass" ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Prefer a direct WhatsApp chat with {fullName} — not a public group.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => copy(shareMessage, "msg")}
            className="flex-1 py-2.5 bg-white/[0.06] text-zinc-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {copied === "msg" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy message
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
