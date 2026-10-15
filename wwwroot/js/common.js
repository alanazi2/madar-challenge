/* مشترك بين الصفحات الثلاث */
const API = (window.MADAR_API_BASE || "") + "/api";
const ORBITS = {
  pos:{ar:"الاحتمالات",en:"POSSIBILITY",n:"01",q:"ماذا ستصنع بالذكاء الاصطناعي؟"},
  idn:{ar:"الهوية",en:"IDENTITY",n:"02",q:"مَن أنت… في عالم يستطيع نسخك؟"},
  jdg:{ar:"القرار",en:"JUDGMENT",n:"03",q:"الآلة تقترح… فمن يقرّر؟"},
  trt:{ar:"الحقيقة",en:"TRUTH",n:"04",q:"صورة حقيقية أم صنعها الذكاء الاصطناعي؟"},
  mix:{ar:"مزيج من المدارات",en:"MIX",n:"",q:"أسئلة من المدارات الأربعة"}
};
const FIELDS = {
  ai:{ar:"الذكاء الاصطناعي وعلم البيانات",short:"الذكاء الاصطناعي والبيانات"},
  cyber:{ar:"الوعي والأمن السيبراني",short:"الأمن السيبراني"}
};
const LEVELS = {1:{ar:"مبتدئ"},2:{ar:"متوسط"},3:{ar:"متقدم"}};
const PLATS = { none:["#f17233","#14100d"], challenges:["#f17233","#14100d"], satr:["#13082F","#f2e7dd"], library:["#4931af","#f2e7dd"] };

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    method: opts.method || "GET",
    headers: Object.assign({ "Content-Type": "application/json" }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let data = null; try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error("http " + r.status); e.status = r.status; e.data = data; throw e; }
  return data;
}
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function store(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } }
function applyPlatform(p){
  const [bg, ink] = PLATS[p] || PLATS.none;
  document.documentElement.style.setProperty("--plat", bg);
  document.documentElement.style.setProperty("--plat-ink", ink);
}
function qs(k){ return new URLSearchParams(location.search).get(k); }
function pubUrl(cfg){ return (cfg && cfg.publicUrl) || (location.origin + (location.pathname.replace(/[^/]*$/, ""))).replace(/\/$/, ""); }
function qrSvg(text, cell = 6){
  const q = qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

/* جوال: يحوّل الأرقام العربية إلى لاتينية ويتحقق من الصيغة (05xxxxxxxx أو دولي) */
function normPhone(v){
  const d = String(v||"").replace(/[\u0660-\u0669]/g, c => c.charCodeAt(0)-0x660).replace(/[\u06F0-\u06F9]/g, c => c.charCodeAt(0)-0x6F0);
  const t = d.trim(), digits = t.replace(/\D/g,"").replace(/^00/,"");
  if (/^966 ?5\d{8}$/.test(digits) && digits.length === 12) return "0" + digits.slice(3);
  if (/^05\d{8}$/.test(digits)) return digits;
  if (/^5\d{8}$/.test(digits)) return "0" + digits;
  if (/^(\+|00)/.test(t) && digits.length >= 9 && digits.length <= 15) return "+" + digits;
  return null;
}
