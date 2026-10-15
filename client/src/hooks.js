import { useEffect, useRef, useState } from "react";
import { api, applyPlatform } from "./api.js";

export function useConfig() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    let alive = true;
    api("/config").catch(() => ({ platform: "none", publicUrl: "", counts: { l1: 12, l2: 15, l3: 15 }, limitMs: 20000 }))
      .then(c => { if (alive) { setCfg(c); applyPlatform(c.platform); } });
    return () => { alive = false; };
  }, []);
  return cfg;
}

/** شريط وقت السؤال: يستدعي onExpire مرة واحدة عند انتهاء المهلة. */
export function useCountdown(limitMs, key, active, onExpire) {
  const [left, setLeft] = useState(1);
  const cb = useRef(onExpire); cb.current = onExpire;
  useEffect(() => {
    if (!active) return;
    setLeft(1);
    const t0 = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, 1 - (performance.now() - t0) / limitMs);
      setLeft(l);
      if (l <= 0) { clearInterval(id); cb.current(); }
    }, 100);
    return () => clearInterval(id);
  }, [key, active, limitMs]);
  return left;
}

export const fmtTime = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
export const stripQ = s => (s || "").replace(/\s*[?؟]+\s*$/, "");
