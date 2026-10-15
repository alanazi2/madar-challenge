import { useCallback, useEffect, useState } from "react";
import { api, API, store, applyPlatform, pubUrl } from "../api.js";
import { useI18n, ORBIT_KEYS, ORBIT_META } from "../i18n.jsx";
import { useConfig } from "../hooks.js";
import LangToggle from "../LangToggle.jsx";
import QR from "../QR.jsx";

const Bar = ({ label, pct, extra }) => (
  <div className="br"><span>{label}</span><i><s style={{ width: Math.min(100, pct) + "%" }} /></i><b className="num">{extra}</b></div>
);

export default function Admin() {
  const { t, orbitName, fieldShort, levelName, pick, lang } = useI18n();
  useConfig();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [gerr, setGerr] = useState("");
  const [day, setDay] = useState("");
  const [S, setS] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [win, setWin] = useState([]);
  const [recs, setRecs] = useState({});
  const [cfg, setCfg] = useState({});
  const [purl, setPurl] = useState("");
  const [msg, setMsg] = useState({});
  const [copyLbl, setCopyLbl] = useState("");
  const [rep, setRep] = useState(null);
  const [partial, setPartial] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const A = useCallback((p, o = {}) => api("/admin" + p, { ...o, headers: { "X-Admin-Pin": pin } }), [pin]);

  const load = useCallback(async (d = day, pn = pin) => {
    const H = { "X-Admin-Pin": pn };
    const g = p => api("/admin" + p, { headers: H });
    const q = d ? "?day=" + d : "";
    const s = await g("/summary" + q);              // الأساس: إن فشل يظهر خطأ الاتصال
    const [r, w, rc, rp] = await Promise.allSettled([g("/rounds" + q), g("/winners?top=3"), g("/recs"), g("/day" + (s.day !== "all" ? "?day=" + s.day : ""))]);
    const val = (x, d) => (x.status === "fulfilled" ? x.value : d);
    setPartial(r.status === "rejected" || w.status === "rejected" || rc.status === "rejected" || rp.status === "rejected");
    setRep(val(rp, null)); setRounds(val(r, [])); setWin(val(w, [])); setRecs(val(rc, {}));
    setS(s); setCfg(s.config); setPurl(s.config.publicUrl || ""); applyPlatform(s.config.platform);
    if (!d) setDay(s.day);
  }, [day, pin]);

  async function login(p) {
    try { await api("/admin/ping", { headers: { "X-Admin-Pin": p } }); } catch { return false; }
    store("madar_pin_s", p); setPin(p); setAuthed(true); await load("", p); return true;
  }
  useEffect(() => { const sv = (() => { try { return sessionStorage.getItem("madar_pin"); } catch { return null; } })(); if (sv) login(sv); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (authed) try { sessionStorage.setItem("madar_pin", pin); } catch { /* ignore */ } }, [authed, pin]);
  useEffect(() => { if (!authed) return; const id = setInterval(() => load(day), 15000); return () => clearInterval(id); }, [authed, day, load]);

  const flash = (k, v) => { setMsg(m => ({ ...m, [k]: v })); setTimeout(() => setMsg(m => ({ ...m, [k]: "" })), 2500); };

  async function download(path, file) {
    const r = await fetch(API + path, { headers: { "X-Admin-Pin": pin } });
    const u = URL.createObjectURL(await r.blob()); const a = document.createElement("a");
    a.href = u; a.download = file; a.click(); URL.revokeObjectURL(u);
  }

  if (!authed) {
    return (
      <div className="wrap wide">
        <header className="top"><img src="/img/madar-logo.png" alt="Madar" height="36" /><span className="grp"><LangToggle /><span className="badge">{t("aTitle")}</span></span></header>
        <section className="gate card">
          <h2>{t("aGate")}</h2><p className="lead">{t("aGateSub")}</p>
          <label className="l" htmlFor="pin" style={{ marginTop: 0 }}>{t("aPin")}</label>
          <input className="t" id="pin" type="password" inputMode="numeric" autoComplete="off" autoFocus style={{ direction: "ltr" }} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={async e => { if (e.key === "Enter") { setGerr(""); if (!(await login(pin))) setGerr(t("aBadPin")); } }} />
          <div className="err" role="alert">{gerr}</div>
          <button className="btn block" onClick={async () => { setGerr(""); if (!(await login(pin))) setGerr(t("aBadPin")); }}>{t("aEnter")}</button>
        </section>
      </div>
    );
  }
  if (!S) return <div className="wrap wide" />;

  const base = pubUrl(cfg);
  const qrItems = [["", t("allOrbits"), t("aHomePage")], ...ORBIT_KEYS.map(k => [k, t("orbitOf", { n: orbitName(k) }), ORBIT_META[k].en])];
  const mx = (arr, f) => Math.max(1, ...arr.map(f));
  const days = S.days.includes(S.day) || S.day === "all" ? S.days : [S.day, ...S.days];

  const copyWinners = async () => {
    const txt = win.map(d => d.day + (d.open ? " (" + t("aOpen") + ")" : "") + "\n" + d.top.map(w => `${w.rank}. ${w.name} — ${w.score} ${t("points")} — ${w.phone || t("aNoPhone")}`).join("\n")).join("\n\n");
    try { await navigator.clipboard.writeText(txt); setCopyLbl(t("aCopied")); } catch { setCopyLbl(t("aCopyFail")); }
    setTimeout(() => setCopyLbl(""), 1800);
  };

  async function dayAction(act) { setRep(await A(`/days/${rep.day}/${act}`, { method: "POST" })); setConfirmEnd(false); load(day); }
  const endDay = () => dayAction("close");
  const setRec = (k, i, f, v) => setRecs(r => ({ ...r, [k]: r[k].map((x, j) => j === i ? { ...x, [f]: v } : x) }));

  return (
    <div className="wrap wide">
      <header className="top"><img src="/img/madar-logo.png" alt="Madar" height="36" /><span className="grp"><LangToggle /><span className="badge">{t("aTitle")}</span></span></header>
      <main>
        <div className="tools">
          <select aria-label={t("aDay")} value={day} onChange={e => { setDay(e.target.value); load(e.target.value); }}>
            {[["all", t("aAllDays")], ...days.map(d => [d, d])].map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
          </select>
          <button className="btn ghost small" onClick={() => load(day)}>{t("aRefresh")}</button>
          <button className="btn ghost small" onClick={() => download("/admin/export.csv", "madar-rounds.csv")}>{t("aCsv")}</button>
          {rep && !rep.closed && !confirmEnd && <button className="btn small danger" onClick={() => setConfirmEnd(true)}>{t("aEndDay")}</button>}
          {partial && <div className="alertbox" role="alert">{t("aPartial")}</div>}
        {confirmEnd && rep && <><button className="btn small danger" onClick={endDay}>{t("aEndConfirm")} ({rep.day})</button><button className="btn ghost small" onClick={() => setConfirmEnd(false)}>{t("aCancel")}</button></>}
          {rep?.closed && <button className="btn ghost small" onClick={() => dayAction("reopen")}>{t("aReopen")}</button>}
          <a className="btn ghost small" href="/screen" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{t("aOpenScreen")}</a>
        </div>
        <div className="kpis">
          <div className="kpi"><b className="num">{S.participants}</b><span>{t("aK1")}</span></div>
          <div className="kpi"><b className="num">{S.rounds}</b><span>{t("aK2")}</span></div>
          <div className="kpi"><b className="num">{S.pct}%</b><span>{t("aK3")}</span></div>
          <div className="kpi"><b className="num">{S.avgScore}</b><span>{t("aK4")}</span></div>
        </div>

        {confirmEnd && <div className="alertbox" role="alert">{t("aEndNote")}</div>}

        {rep && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="tools" style={{ marginBottom: 6 }}>
              <h2 style={{ margin: 0, flex: 1 }}>{t("aReport")} · {rep.day} <span className={rep.closed ? "pill" : "live"}>{rep.closed ? t("aClosed") + " · " + t("aClosedAt", { t: new Date(rep.closedAt).toLocaleTimeString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) }) : t("aDayOpen")}</span></h2>
              <button className="btn ghost small" onClick={() => download("/admin/day.csv?day=" + rep.day, `madar-${rep.day}.csv`)}>{t("aExportDay")}</button>
            </div>
            <p className="lead" style={{ fontSize: 13 }}>{t("aReportSub")} · {t("aPeople", { a: rep.participants, b: rep.rounds })}</p>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>#</th><th>{t("aColName")}</th><th>{t("aColPhone")}</th><th>{t("aColField")}</th><th>{t("aColScore")}</th><th>{t("aColCorrect")}</th><th>{t("aColRounds")}</th></tr></thead>
                <tbody>
                  {rep.rows.length === 0 && <tr><td colSpan="7" className="muted">{t("aNoParticipants")}</td></tr>}
                  {rep.rows.map(r => (
                    <tr key={r.rank + r.name} className={r.rank <= 3 ? "top3" : ""}>
                      <td className="n num">{r.rank}</td><td>{r.name}</td>
                      <td className="n">{r.phone ? <a className="tel" href={"tel:" + r.phone} style={{ color: "var(--cyan)", direction: "ltr", unicodeBidi: "isolate", textDecoration: "none" }}>{r.phone}</a> : <span className="muted">{t("aNoPhone")}</span>}</td>
                      <td>{fieldShort(r.field)} · {orbitName(r.orbit)}</td><td className="n num"><b>{r.score}</b></td><td className="n num">{r.correct}/{r.total}</td><td className="n num">{r.roundsPlayed}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }} id="winCard">
          <div className="tools" style={{ marginBottom: 6 }}>
            <h2 style={{ margin: 0, flex: 1 }}>{t("aWinners")}</h2>
            <button className="btn ghost small" onClick={copyWinners}>{copyLbl || t("aCopy")}</button>
            <button className="btn ghost small" onClick={() => download("/admin/winners.csv?top=3", "madar-winners.csv")}>{t("aWinCsv")}</button>
            <button className="btn ghost small" onClick={() => window.print()}>{t("aPrint")}</button>
          </div>
          <p className="lead" style={{ fontSize: 13 }}>{t("aWinSub")}</p>
          <div className="wins">
            {win.length === 0 && <span className="muted">{t("aNoResults")}</span>}
            {win.map(d => (
              <div className="win" key={d.day}>
                <h3>{d.day}{d.open && <span className="live">{t("aOpen")}</span>}</h3>
                <div className="sub">{t("aPeople", { a: d.participants, b: d.rounds })}</div>
                <ol>
                  {d.top.map(w => (
                    <li key={w.rank}>
                      <span className="rk num">{w.rank}</span>
                      <span>{w.name}<small>{fieldShort(w.field)} · {orbitName(w.orbit)} · {w.correct}/{w.total}</small></span>
                      <span style={{ textAlign: "end" }}><b className="num">{w.score}</b><br />{w.phone ? <a className="tel" href={"tel:" + w.phone}>{w.phone}</a> : <small>{t("aNoPhone")}</small>}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        <div className="grid2">
          <div className="card"><h2>{t("aByOrbit")}</h2><div className="bars">
            {S.byOrbit.map(x => <Bar key={x.key} label={t("orbitOf", { n: orbitName(x.key) })} pct={x.rounds / mx(S.byOrbit, y => y.rounds) * 100} extra={`${x.rounds} · ${x.pct}%`} />)}</div></div>
          <div className="card"><h2>{t("aByField")}</h2><div className="bars">
            {S.byField.map(x => <Bar key={x.key} label={fieldShort(x.key)} pct={x.rounds / mx(S.byField, y => y.rounds) * 100} extra={`${x.rounds} · ${x.pct}%`} />)}</div>
            <h2 style={{ marginTop: 18 }}>{t("aByLevel")}</h2><div className="bars">
              {S.byLevel.map(x => <Bar key={x.key} label={levelName(x.key)} pct={x.rounds / mx(S.byLevel, y => y.rounds) * 100} extra={`${x.rounds} · ${x.pct}%`} />)}</div></div>
        </div>
        <div className="grid2">
          <div className="card"><h2>{t("aByHour")}</h2><div className="bars">
            {S.byHour.length ? S.byHour.map(x => <Bar key={x.hour} label={String(x.hour).padStart(2, "0") + ":00"} pct={x.rounds / mx(S.byHour, y => y.rounds) * 100} extra={x.rounds} />) : <span className="muted">{t("aNoData")}</span>}</div></div>
          <div className="card"><h2>{t("aHard")}</h2><p className="lead" style={{ fontSize: 13 }}>{t("aHardSub")}</p>
            <table><thead><tr><th>{t("aQ")}</th><th>{t("aOk")}</th></tr></thead><tbody>
              {S.hardest.length ? S.hardest.map(h => (
                <tr key={h.id}><td dir="auto">{lang === "en" && h.qEn ? h.qEn : h.q}<br /><span className="pill">{orbitName(h.orbit)} · {fieldShort(h.field)}</span></td><td className="n num">{h.pct}% <span className="muted">({h.n})</span></td></tr>
              )) : <tr><td colSpan="2" className="muted">{t("aNotEnough")}</td></tr>}</tbody></table></div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2>{t("aQrTitle")}</h2><p className="lead" style={{ fontSize: 14 }}>{t("aQrSub")}</p>
          <div className="tools" style={{ marginBottom: 12 }}>
            <input className="t" placeholder="https://madar-challenge.example.com" style={{ maxWidth: 420, direction: "ltr" }} value={purl} onChange={e => setPurl(e.target.value)} />
            <button className="btn small" onClick={async () => { try { setCfg(await A("/public-url", { method: "PUT", body: { url: purl } })); flash("url", t("aSaved")); } catch { flash("url", t("aBadUrl")); } }}>{t("aSaveUrl")}</button>
            <span className="muted">{msg.url}</span>
          </div>
          <div className="qrs">
            {qrItems.map(([k, title]) => { const link = base + "/" + (k ? "?orbit=" + k : "");
              return <div className="qrc" key={k || "all"}><div className="box"><QR text={link} cell={6} label={title} /></div><b>{title}</b><small>{link}</small></div>; })}
          </div>
        </div>

        <div className="grid2">
          <div className="card"><h2>{t("aPlat")}</h2><p className="lead" style={{ fontSize: 14 }}>{t("aPlatSub")}</p>
            <div className="chips">{Object.entries(t("aPlatNames")).map(([k, txt]) => (
              <button key={k} className="chip" aria-pressed={cfg.platform === k} onClick={async () => { const c = await A("/platform", { method: "PUT", body: { platform: k } }); setCfg(c); applyPlatform(c.platform); }}>{txt}</button>))}</div></div>
          <div className="card"><h2>{t("aLast")}</h2><p className="lead" style={{ fontSize: 13 }}>{t("aLastSub")}</p>
            <table><tbody>
              {rounds.length === 0 && <tr><td className="muted">{t("aNoRounds")}</td></tr>}
              {rounds.slice(0, 30).map(r => (
                <tr key={r.id} style={{ opacity: r.hidden ? .45 : 1 }}>
                  <td>{r.name}{r.phone && <><br /><bdi dir="ltr" className="muted" style={{ fontSize: 12 }}>{r.phone}</bdi></>}<br /><span className="pill">{r.orbit ? orbitName(r.orbit) : ""} · {fieldShort(r.field)}</span></td>
                  <td className="n num">{r.score}</td>
                  <td><button className="btn ghost small" onClick={async () => { await A(`/rounds/${r.id}/${r.hidden ? "show" : "hide"}`, { method: "POST" }); load(day); }}>{r.hidden ? t("aShow") : t("aHide")}</button></td>
                </tr>))}</tbody></table></div>
        </div>

        <div className="card">
          <h2>{t("aRecs")}</h2><p className="lead" style={{ fontSize: 14 }}>{t("aRecsSub")}</p>
          {Object.entries(recs).map(([k, list]) => list.map((r, i) => (
            <div className="rr" key={k + i}>
              <span className="pill">{t("aRecNames")[k] || k}{list.length > 1 ? " · " + (i + 1) : ""}</span>
              <input className="t" dir="auto" value={r.title} aria-label={t("aTitleAr")} placeholder={t("aTitleAr")} onChange={e => setRec(k, i, "title", e.target.value)} />
              <input className="t" dir="ltr" value={r.titleEn || ""} aria-label={t("aTitleEn")} placeholder={t("aTitleEn")} onChange={e => setRec(k, i, "titleEn", e.target.value)} />
              <input className="t u" value={r.url} aria-label={t("aUrl")} onChange={e => setRec(k, i, "url", e.target.value)} />
              <span />
              <input className="t" dir="auto" value={r.why} aria-label={t("aWhyAr")} placeholder={t("aWhyAr")} onChange={e => setRec(k, i, "why", e.target.value)} />
              <input className="t" dir="ltr" value={r.whyEn || ""} aria-label={t("aWhyEn")} placeholder={t("aWhyEn")} onChange={e => setRec(k, i, "whyEn", e.target.value)} />
            </div>)))}
          <div className="tools" style={{ marginTop: 12 }}>
            <button className="btn small" onClick={async () => { try { setRecs(await A("/recs", { method: "PUT", body: recs })); flash("rec", t("aSaved")); } catch { flash("rec", t("aBadRecs")); } }}>{t("aSaveRecs")}</button>
            <span className="muted">{msg.rec}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
