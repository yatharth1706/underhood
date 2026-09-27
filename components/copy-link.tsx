"use client";

import { useState } from "react";

export function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt("Copy this link", window.location.href);
        }
      }}
      className="border border-rule-strong bg-ink px-3 py-1.5 font-mono text-xs text-paper hover:bg-accent hover:border-accent"
    >
      {copied ? "Copied ✓" : "Share · copy link"}
    </button>
  );
}
