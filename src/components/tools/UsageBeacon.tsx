"use client";

import { useEffect } from "react";

export type UsageAction = "execute" | "execute_error" | "copy" | "download" | "share";

declare global {
  interface Window {
    kk?: {
      land: (tool: string) => void;
      track: (event: string, extra?: { tool?: string }) => void;
    };
    kkq?: [string, { tool?: string }][];
    __kkTool?: string;
    __kkLandAt?: number;
  }
}

function ensureScript() {
  if (document.getElementById("kk-usage")) return;
  const el = document.createElement("script");
  el.id = "kk-usage";
  el.src = "/k.js";
  el.defer = true;
  document.head.appendChild(el);
}

export function trackUsage(event: UsageAction, tool: string) {
  if (typeof window === "undefined") return;
  const extra = { tool };
  if (window.kk) {
    window.kk.track(event, extra);
    return;
  }
  window.kkq = window.kkq || [];
  window.kkq.push([event, extra]);
}

export function UsageBeacon({ tool }: { tool: string }) {
  useEffect(() => {
    window.__kkLandAt = Date.now();
    window.__kkTool = tool;
    ensureScript();
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (window.kk) {
        window.kk.land(tool);
        window.clearInterval(timer);
      } else if (tries > 40) {
        window.clearInterval(timer);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [tool]);
  return null;
}
