import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Download, Check, Copy } from "lucide-react";

export interface QRCodeViewProps {
  value?: string;
  data?: string;
  size?: number;
  className?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  showActions?: boolean;
  showDownload?: boolean;
  showCopyValue?: boolean;
  fgColor?: string;
  bgColor?: string;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export default function QRCodeView({
  value,
  data,
  size = 200,
  className = "",
  alt = "QR Code",
  title,
  subtitle,
  showActions = false,
  showDownload = false,
  showCopyValue = false,
  fgColor = "#000000",
  bgColor = "#ffffff",
  margin = 2,
  errorCorrectionLevel = "M"
}: QRCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState(false);

  const qrText = value || data || "";

  useEffect(() => {
    let isMounted = true;
    if (!qrText) {
      setDataUrl("");
      return;
    }

    QRCode.toDataURL(qrText, {
      width: size * 2, // 2x for retina crispness
      margin,
      color: {
        dark: fgColor,
        light: bgColor
      },
      errorCorrectionLevel
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setHasError(false);
        }
      })
      .catch((err) => {
        console.error("QRCode generation error:", err);
        if (isMounted) {
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [qrText, size, fgColor, bgColor, margin, errorCorrectionLevel]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR_${(title || "Code").replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shouldShowDownload = showDownload || showActions;
  const shouldShowCopy = showCopyValue || showActions;

  if (hasError) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center p-3 text-center text-xs text-zinc-400 ${className}`}
      >
        QR Unavailable
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {title && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          {title}
        </span>
      )}
      <div
        className="relative bg-white rounded-xl p-1.5 shadow-sm border border-zinc-200/80 flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={alt}
            width={size}
            height={size}
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <div className="animate-pulse w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
            <span className="text-[10px] text-zinc-400">Loading QR...</span>
          </div>
        )}
      </div>

      {subtitle && (
        <span className="text-[10px] text-zinc-500 font-mono">
          {subtitle}
        </span>
      )}

      {(shouldShowDownload || shouldShowCopy) && (
        <div className="flex items-center gap-1.5 text-xs">
          {shouldShowDownload && dataUrl && (
            <button
              onClick={handleDownload}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Download QR Image"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
          )}
          {shouldShowCopy && (
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Copy Payload to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
