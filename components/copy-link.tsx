"use client";

import { useState } from "react";

export function CopyLink({ url, className = "" }: { url?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const href = url ? new URL(url, window.location.href).href : window.location.href;
        try {
          await navigator.clipboard.writeText(href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt("Copy this link", href);
        }
      }}
      className={`rounded-[9px] bg-accent px-[13px] py-[7px] font-semibold whitespace-nowrap text-on-accent hover:brightness-110 ${className}`}
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
