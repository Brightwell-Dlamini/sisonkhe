/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared Sisonkhe logo + optional wordmark.
 */

import Link from "next/link";

type Size = "xs" | "sm" | "md" | "lg";

const BOX: Record<Size, string> = {
  xs: "w-7 h-7",
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-14 h-14",
};

const TITLE: Record<Size, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

interface Props {
  size?: Size;
  showText?: boolean;
  showSubtitle?: boolean;
  href?: string;
  className?: string;
  inverse?: boolean;
}

export default function BrandMark({
  size = "md",
  showText = true,
  showSubtitle = false,
  href,
  className = "",
  inverse = false,
}: Props) {
  const titleColor = inverse
    ? "text-white"
    : "text-zinc-900 dark:text-white";
  const subColor = inverse
    ? "text-zinc-400"
    : "text-zinc-500 dark:text-zinc-400";

  const inner = (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.jpg"
        alt="Sisonkhe"
        className={`${BOX[size]} rounded-xl object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10 shrink-0`}
      />
      {showText && (
        <span className="min-w-0 text-left">
          <span
            className={`block font-black uppercase tracking-tight leading-none ${TITLE[size]} ${titleColor}`}
          >
            Sisonkhe
          </span>
          {showSubtitle && (
            <span
              className={`block mt-0.5 text-[10px] font-bold uppercase tracking-widest ${subColor}`}
            >
              In Transit
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex group hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}
