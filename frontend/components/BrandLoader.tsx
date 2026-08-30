"use client";

import { useEffect, useState } from "react";

export default function BrandLoader({
  compact = false,
  label = "Loading HireALocals",
  delayMs = 180,
}: {
  compact?: boolean;
  label?: string;
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  if (!visible) {
    return (
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {label}
      </span>
    );
  }

  return (
    <div
      className={`brand-loader brand-loader-pro ${
        compact ? "compact" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="brand-loader-icon" aria-hidden="true">
        <img src="/icon.svg" alt="" />
      </div>

      <div className="brand-loader-name" aria-hidden="true">
        HireA<span>Locals</span>
      </div>

      <div className="brand-loader-progress" aria-hidden="true">
        <span />
      </div>

      <span className="sr-only">
        {label}
      </span>
    </div>
  );
}
