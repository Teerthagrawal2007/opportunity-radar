"use client";

import React from "react";
import { AlertCircle, Key, RefreshCw, Clock, WifiOff, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  onRetry,
}) => {
  let icon = <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;

  if (message.toLowerCase().includes("key") || message.toLowerCase().includes("wrong")) {
    icon = <Key className="w-5 h-5 text-amber-500 shrink-0" />;
  } else if (message.toLowerCase().includes("limit") || message.toLowerCase().includes("wait")) {
    icon = <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
  } else if (message.toLowerCase().includes("reach") || message.toLowerCase().includes("network")) {
    icon = <WifiOff className="w-5 h-5 text-red-500 shrink-0" />;
  }

  return (
    <div className="max-w-3xl mx-auto my-6 p-4 rounded-2xl bg-red-50/90 dark:bg-red-950/60 border border-red-200 dark:border-red-900/80 shadow-md flex items-start justify-between gap-3 transition">
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
            Search Notice
          </h4>
          <p className="mt-0.5 text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Search</span>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 rounded-md transition"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
