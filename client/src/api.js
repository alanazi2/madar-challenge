export const API = (window.MADAR_API_BASE || "") + "/api";

export async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    method: opts.method || "GET",
    headers: Object.assign({ "Content-Type": "application/json" }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* no body */ }
  if (!r.ok) { const e = new Error("http " + r.status); e.status = r.status; e.data = data; throw e; }
  return data;
}

export function store(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; }
}

/** جوال: يحوّل الأرقام العربية إلى لاتينية ويتحقق من الصيغة (05xxxxxxxx أو دولي) */
export function normPhone(v) {
  const d = String(v || "").replace(/[٠-٩]/g, c => c.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, c => c.charCodeAt(0) - 0x6F0);
  const t = d.trim(), digits = t.replace(/\D/g, "").replace(/^00/, "");
  if (/^966 ?5\d{8}$/.test(digits) && digits.length === 12) return "0" + digits.slice(3);
  if (/^05\d{8}$/.test(digits)) return digits;
  if (/^5\d{8}$/.test(digits)) return "0" + digits;
  if (/^(\+|00)/.test(t) && digits.length >= 9 && digits.length <= 15) return "+" + digits;
  return null;
}

export const PLATS = { none: ["#f17233", "#14100d"], challenges: ["#f17233", "#14100d"], satr: ["#13082F", "#f2e7dd"], library: ["#4931af", "#f2e7dd"] };
export function applyPlatform(p) {
  const [bg, ink] = PLATS[p] || PLATS.none;
  document.documentElement.style.setProperty("--plat", bg);
  document.documentElement.style.setProperty("--plat-ink", ink);
}

export function pubUrl(cfg) {
  return ((cfg && cfg.publicUrl) || location.origin).replace(/\/$/, "");
}
