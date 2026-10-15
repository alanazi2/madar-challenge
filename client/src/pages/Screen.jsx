import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, normPhone, pubUrl } from "../api.js";
import { useI18n, ORBIT_KEYS, ORBIT_META } from "../i18n.jsx";
import { useConfig, useCountdown, fmtTime, stripQ } from "../hooks.js";
import LangToggle from "../LangToggle.jsx";
import QR from "../QR.jsx";

const TONE = { pos: "var(--orange)", idn: "var(--cyan)", jdg: "var(--ivory)", trt: "var(--orange)" };
const OrbSvg = () => (
  <svg viewBox="0 0 140 86" aria-hidden="true"><ellipse cx="95" cy="64" rx="76" ry="28" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(-18 95 64)" /><circle cx="64" cy="40" r="5" fill="currentColor" /></svg>
);

export default function Screen() {
  const { t, lang, orbitName, orbitQuestion, fieldName, fieldShort, levelName, pick } = useI18n();
  const cfg = useConfig();
  const [sp] = useSearchParams();
  const orbitParam = ORBIT_KEYS.includes(sp.get("orbit")) ? sp.get("orbit") : "";
  const [view, setView] = useState("play");
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState(null);
  const [field, setField] = useState(null);
  const [orbit, setOrbit] = useState(orbitParam);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sid, setSid] = useState(null);
  const [q, setQ] = useState(null);
  const [fb, setFb] = useState(null);
  const [picked, setPicked] = useState(null);
  const [pts, setPts] = useState(0);
  const [fin, setFin] = useState(null);
  const [stats, setStats] = useState({ participantsToday: 0, playingNow: 0 });
  const [mini, setMini] = useState(null);
  const [bf, setBf] = useState("");
  const [bRows, setBRows] = useState(null);
  const [idle, setIdle] = useState(0);
  const last = useRef(Date.now());
  const nextRef = useRef(null);
  const phoneRef = useRef(null);
  const nameRef = useRef(null);
  const errRef = useRef(null);
  useEffect(() => { if (err) errRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [err]);

  const touch = () => { last.current = Date.now(); };
  useEffect(() => { const h = () => touch(); addEventListener("pointerdown", h, true); addEventListener("keydown", h, true); return () => { removeEventListener("pointerdown", h, true); removeEventListener("keydown", h, true); }; }, []);

  const reset = useCallback(() => {
    setStep(1); setLevel(null); setField(null); setOrbit(orbitParam); setName(""); setPhone(""); setErr("");
    setSid(null); setQ(null); setFb(null); setPicked(null); setFin(null); touch(); window.scrollTo(0, 0);
  }, [orbitParam]);

  useEffect(() => { if (step === 5) setIdle(60); }, [step]);

  // عودة تلقائية للبداية: الشاشة ثابتة وجاهزة للمشارك التالي
  useEffect(() => {
    const id = setInterval(() => {
      if (view !== "play") return;
      const s = (Date.now() - last.current) / 1000;
      const limit = step === 5 ? 60 : step === 4 ? 120 : step === 1 ? Infinity : 90;
      setIdle(step === 5 ? Math.max(0, Math.ceil(limit - s)) : 0);
      if (s > limit) reset();
    }, 1000);
    return () => clearInterval(id);
  }, [view, step, reset]);

  const refresh = useCallback(async () => {
    try {
      const [st, rows] = await Promise.all([api("/stats"), api("/leaderboard?limit=5" + (orbitParam ? "&orbit=" + orbitParam : ""))]);
      setStats(st); setMini(rows);
    } catch { /* keep last */ }
  }, [orbitParam]);
  useEffect(() => { refresh(); const id = setInterval(refresh, 4000); return () => clearInterval(id); }, [refresh]);

  const loadBoard = useCallback(async f => {
    try { setBRows(await api(`/leaderboard?limit=15${f ? `&field=${f}` : ""}${orbitParam ? `&orbit=${orbitParam}` : ""}`)); } catch { /* keep */ }
  }, [orbitParam]);
  useEffect(() => { if (view === "board") { loadBoard(bf); const id = setInterval(() => loadBoard(bf), 4000); return () => clearInterval(id); } }, [view, bf, loadBoard]);

  async function start() {
    setErr("");
    const nm = name.trim().replace(/\s+/g, " ");
    if (!orbit) return setErr(t("errOrbit"));
    if (nm.length < 2) return setErr(t("errName"));
    const ph = normPhone(phone);
    if (!ph) return setErr(t("errPhone"));
    setBusy(true);
    try {
      const r = await api("/sessions", { method: "POST", body: { name: nm, phone: ph, field, level, orbit, lang } });
      setSid(r.sessionId); setPts(0); setFb(null); setPicked(null); setQ(r.question); setStep(4); touch(); window.scrollTo(0, 0);
    } catch (e) { setErr(e.status === 423 ? t("errClosed") : e.status === 429 ? t("errBusy") : t("errStart")); }
    finally { setBusy(false); }
  }
  async function submit(choice) {
    if (fb || !q) return;
    setPicked(choice); touch();
    try {
      const r = await api(`/sessions/${sid}/answer`, { method: "POST", body: { index: q.index, choice } });
      setFb(r); setPts(r.score);
      setTimeout(() => nextRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
    } catch { setFb({ lost: true }); }
  }
  const left = useCountdown(q?.limitMs || 20000, q?.id + ":" + q?.index, step === 4 && !!q && !fb, () => submit(-1));
  function nextStep() {
    if (fb?.lost) return reset();
    if (fb.final) { setFin(fb.final); setStep(5); touch(); refresh(); window.scrollTo(0, 0); return; }
    setQ(fb.next); setFb(null); setPicked(null);
  }

  const link = pubUrl(cfg) + "/" + (orbitParam ? "?orbit=" + orbitParam : "");
  const counts = cfg ? [cfg.counts.l1, cfg.counts.l2, cfg.counts.l3] : [12, 15, 15];
  const meta = orbitParam ? ORBIT_META[orbitParam] : null;
  const miniTitle = orbitParam ? t("boardOrbit", { n: orbitName(orbitParam) }) : t("boardTitle");
  const rowLi = r => <li key={r.rank + r.name}><span className="rk num">{r.rank}</span><span className="nm">{r.name}<small>{fieldShort(r.field)}</small></span><span className="sc num">{r.score}</span></li>;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><img src="/img/madar-logo.png" alt="مدار Madar" /><span className="badge">{t("badge")}</span><LangToggle /></div>
        <nav className="nav" role="tablist" aria-label={t("tabs")}>
          <button role="tab" aria-selected={view === "play"} onClick={() => setView("play")}>{t("tabPlay")}</button>
          <button role="tab" aria-selected={view === "board"} onClick={() => setView("board")}>{t("tabBoard")}</button>
        </nav>
      </header>

      <div className="layout">
        <main>
          {view === "play" && (
            <div>
              {step < 4 && (
                <div className="kiosk"><div className="steps" aria-hidden="true">
                  {t("steps").map((s, i) => [i > 0 && <i key={"i" + i} />, <span key={i} className={i + 1 === step ? "on" : i + 1 < step ? "done" : ""}><b>{i + 1}</b>{s}</span>])}
                </div></div>
              )}

              {step === 1 && (
                <section className="kiosk">
                  <div className="stepq"><div className="eyebrow">STEP 1 · LEVEL</div><h2>{t("s1h1")} <span className="cy">{t("s1h2")}</span></h2><p>{t("s1p")}</p></div>
                  <div className="levels" role="group" aria-label={t("level")}>
                    {[1, 2, 3].map(l => (
                      <button key={l} className="lvl" aria-pressed={level === l} onClick={() => setLevel(l)}>
                        <div className="bars3">{[1, 2, 3].map(i => <i key={i} className={i <= l ? "f" : ""} />)}</div>
                        <b>{levelName(l)}</b><span>{t("nQ", { n: counts[l - 1] })} · {t("lv" + l + "d")}</span>
                      </button>
                    ))}
                  </div>
                  <div className="navrow"><span /><button className="btn" disabled={!level} onClick={() => setStep(2)}>{t("next")}</button></div>
                </section>
              )}

              {step === 2 && (
                <section className="kiosk">
                  <div className="stepq"><div className="eyebrow">STEP 2 · FIELD</div><h2>{t("s2h1")} <span className="cy">{t("s2h2")}</span></h2><p>{t("s2p")}</p></div>
                  <div className="specs" role="group" aria-label={t("field")}>
                    {["ai", "cyber"].map(k => <button key={k} className="spec" aria-pressed={field === k} onClick={() => setField(k)}><b>{fieldName(k)}</b></button>)}
                  </div>
                  <div className="navrow"><button className="btn ghost" onClick={() => setStep(1)}>{t("back")}</button><button className="btn" disabled={!field} onClick={() => { setStep(3); setTimeout(() => nameRef.current?.focus(), 50); }}>{t("next")}</button></div>
                </section>
              )}

              {step === 3 && (
                <section className="kiosk">
                  <div className="stepq"><div className="eyebrow">STEP 3 · ORBIT</div><h2>{t("s3h1")} <span className="cy">{t("s3h2")}</span></h2><p>{t("s3p")}</p></div>
                  <div className="orbs" role="group" aria-label={t("orbit")}>
                    {ORBIT_KEYS.map(k => (
                      <button key={k} className="orb" style={{ "--tone": TONE[k] }} aria-pressed={orbit === k} onClick={() => setOrbit(k)}>
                        <div className="en">{ORBIT_META[k].en}</div><b>{t("orbitOf", { n: orbitName(k) })}</b><span>{orbitQuestion(k)}</span><OrbSvg />
                      </button>
                    ))}
                  </div>
                  <div className="namebox">
                    <label htmlFor="pname">{t("name")}</label>
                    <input id="pname" ref={nameRef} maxLength={24} autoComplete="off" placeholder={t("namePh")} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && phoneRef.current?.focus()} />
                  </div>
                  <div className="namebox">
                    <label htmlFor="pphone">{t("phone")}</label>
                    <input id="pphone" ref={phoneRef} className="phone-in" type="tel" inputMode="tel" dir="ltr" maxLength={20} autoComplete="off" placeholder={t("phonePh")} value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && start()} />
                  </div>
                  <p className="hint" style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 14 }}>{t("privacy")}</p>
                  <div className="err alertbox" role="alert" ref={errRef}>{err}</div>
                  <div className="navrow"><button className="btn ghost" onClick={() => setStep(2)}>{t("back")}</button><button className="btn" disabled={busy} onClick={start}>{t("startRound")}</button></div>
                </section>
              )}

              {step === 4 && q && (
                <section className="kiosk">
                  <div className="picked">{[t("orbitOf", { n: orbitName(orbit) }), levelName(level), fieldShort(field)].map(x => <span key={x}>{x}</span>)}</div>
                  <div className="qcard">
                    <div className="qhead"><span className="k">{t("qOf", { i: q.index, n: q.total })}</span><span className="pts">{t("pts", { n: pts })}</span></div>
                    <div className="timer"><i style={{ transform: `scaleX(${fb ? 0 : left})` }} /></div>
                    <div className="qt" dir="auto">{q.q}</div>
                    <div className="opts">
                      {q.o.map((txt, i) => {
                        const cls = fb && !fb.lost ? (i === fb.correctChoice ? " ok" : i === picked && !fb.correct ? " no" : "") : "";
                        return <button key={i} type="button" className={"opt" + cls} disabled={!!fb} onClick={() => submit(i)}><i>{t("letters")[i]}</i><span dir="auto">{txt}</span></button>;
                      })}
                    </div>
                    <div aria-live="polite">
                      {fb?.lost && <div className="ex no"><b>{t("lost")}</b>{t("lostMsg")}</div>}
                      {fb && !fb.lost && (
                        <div className={"ex " + (fb.correct ? "ok" : "no")}>
                          <b>{fb.correct ? t("right", { p: fb.points }) : picked < 0 ? t("timeUp") : t("wrong")}</b>
                          <span dir="auto">{fb.explanation}</span>
                          <small>{t("source")} · <bdi dir="ltr">{stripQ(fb.src)}</bdi></small>
                        </div>
                      )}
                    </div>
                    <div className="qfoot"><button className="btn ghost" onClick={reset}>{t("quit")}</button>{fb && <button ref={nextRef} className="btn" onClick={nextStep}>{fb.lost ? t("newRound") : fb.final ? t("result") : t("next")}</button>}</div>
                  </div>
                </section>
              )}

              {step === 5 && fin && (
                <section className="result">
                  <div className="eyebrow">ORBIT · {ORBIT_META[orbit]?.en}</div>
                  <h2 style={{ marginTop: 6 }}>{fin.name}</h2>
                  <div className="score num">{fin.score}</div>
                  <div className="rstats">
                    <div><b className="num">{t("ofN", { a: fin.correct, b: fin.total })}</b><span>{t("correct")}</span></div>
                    <div><b className="num">{t("ofN", { a: fin.rank, b: fin.participants })}</b><span>{t("rankToday")}</span></div>
                    <div><b className="num">{fmtTime(fin.ms)}</b><span>{t("roundTime")}</span></div>
                  </div>
                  <h3 style={{ fontSize: 22, marginTop: 8 }}>{t("nextStep")}</h3>
                  <p className="mut" style={{ margin: "4px 0 0", fontSize: 15 }}>{t("scanAny")}</p>
                  <div className="journey">
                    {[[t("satr"), fin.satr], [t("library"), fin.library], [t("challenges"), fin.challenge]].filter(([, r]) => r && r.url).map(([p, r]) => (
                      <div className="rc" key={p}>
                        <div className="h"><b>{p}</b></div>
                        <div className="t" dir="auto">{pick(r.title, r.titleEn)}</div>
                        <div className="why" dir="auto">{pick(r.why, r.whyEn)}</div>
                        <div className="q"><div className="b"><QR text={r.url} cell={4} label={p} /></div></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 24 }}><button className="btn" onClick={reset}>{t("newRound")}</button></div>
                  <div className="reset">{t("resetIn", { n: idle })}</div>
                </section>
              )}
            </div>
          )}

          {view === "board" && (
            <section className="panel">
              <div className="eyebrow">LEADERBOARD</div>
              <h2 style={{ marginTop: 4 }}>{orbitParam ? t("boardOrbitFull", { n: orbitName(orbitParam) }) : t("boardTitle")}</h2>
              <div className="chips">
                {[["", t("all")], ["ai", fieldShort("ai")], ["cyber", fieldShort("cyber")]].map(([k, txt]) => <button key={k} className="chip" aria-pressed={bf === k} onClick={() => setBf(k)}>{txt}</button>)}
              </div>
              <ol className="lb">
                {bRows && bRows.length === 0 && <li className="empty" style={{ display: "block" }}>{t("beFirst")}</li>}
                {bRows && bRows.map(rowLi)}
              </ol>
            </section>
          )}
        </main>

        <aside className="side" aria-label="QR">
          <section className="qrpanel">
            <div className="eyebrow">{meta ? `ORBIT ${meta.n} · ${meta.en}` : "MADAR · CHALLENGE"}</div>
            <h3>{t("orSign")}</h3>
            <div className="qrbox"><QR text={link} cell={8} label={t("qrLabel")} /></div>
            <div className="url">{link.replace(/^https?:\/\//, "")}</div>
            <p>{t("scanHint")}</p>
          </section>
          <section className="mini">
            <div className="hd"><h3>{miniTitle}</h3><span className="live">{t("live")}</span></div>
            <div className="kp">
              <div><b className="num">{stats.participantsToday}</b><span>{t("todayP")}</span></div>
              <div><b className="num">{stats.playingNow}</b><span>{t("playingNow")}</span></div>
            </div>
            <ol className="lb">
              {mini && mini.length === 0 && <li className="empty" style={{ display: "block" }}>{t("beFirstHere")}</li>}
              {mini && mini.map(rowLi)}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
