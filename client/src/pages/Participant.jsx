import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, store, normPhone } from "../api.js";
import { useI18n, ORBIT_KEYS } from "../i18n.jsx";
import { useConfig, useCountdown, fmtTime, stripQ } from "../hooks.js";
import LangToggle from "../LangToggle.jsx";

export default function Participant() {
  const { t, lang, orbitName, orbitQuestion, fieldName, fieldShort, levelName } = useI18n();
  const cfg = useConfig();
  const [sp] = useSearchParams();
  const [view, setView] = useState("start");
  const [orbit, setOrbit] = useState(ORBIT_KEYS.includes(sp.get("orbit")) ? sp.get("orbit") : "mix");
  const [field, setField] = useState(null);
  const [level, setLevel] = useState(null);
  const [name, setName] = useState(() => store("madar_name") || "");
  const [phone, setPhone] = useState(() => store("madar_phone") || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sid, setSid] = useState(null);
  const [q, setQ] = useState(null);
  const [fb, setFb] = useState(null);       // نتيجة الإجابة الحالية
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [fin, setFin] = useState(null);
  const [board, setBoard] = useState({ field: "", rows: null });
  const nextRef = useRef(null);
  const errRef = useRef(null);
  useEffect(() => { if (err) errRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [err]);

  const counts = cfg ? [cfg.counts.l1, cfg.counts.l2, cfg.counts.l3] : [12, 15, 15];

  async function start() {
    setErr("");
    const nm = name.trim().replace(/\s+/g, " ");
    const ph = normPhone(phone);
    if (nm.length < 2) return setErr(t("errName"));
    if (!ph) return setErr(t("errPhone"));
    if (!field) return setErr(t("errField"));
    if (!level) return setErr(t("errLevel"));
    store("madar_name", nm); store("madar_phone", ph);
    setBusy(true);
    try {
      const r = await api("/sessions", { method: "POST", body: { name: nm, phone: ph, field, level, orbit, lang } });
      setSid(r.sessionId); setScore(0); setFb(null); setPicked(null); setQ(r.question); setView("quiz");
      window.scrollTo(0, 0);
    } catch (e) { setErr(e.status === 423 ? t("errClosed") : e.status === 429 ? t("errBusy") : t("errStart")); }
    finally { setBusy(false); }
  }

  async function submit(choice) {
    if (fb || !q) return;
    setPicked(choice);
    try {
      const r = await api(`/sessions/${sid}/answer`, { method: "POST", body: { index: q.index, choice } });
      setFb(r); setScore(r.score);
      setTimeout(() => nextRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
    } catch { setFb({ lost: true }); }
  }
  const left = useCountdown(q?.limitMs || 20000, q?.id + ":" + q?.index, view === "quiz" && !!q && !fb, () => submit(-1));

  function nextStep() {
    if (fb?.lost) { setView("start"); setQ(null); setFb(null); return; }
    if (fb.final) { setFin(fb.final); setView("result"); window.scrollTo(0, 0); return; }
    setQ(fb.next); setFb(null); setPicked(null);
  }

  async function showBoard(f = "") {
    setView("board"); setBoard({ field: f, rows: null });
    try {
      const rows = await api(`/leaderboard?limit=15${f ? `&field=${f}` : ""}${orbit !== "mix" ? `&orbit=${orbit}` : ""}`);
      setBoard({ field: f, rows });
    } catch { setBoard({ field: f, rows: false }); }
  }

  const chk = view === "quiz" ? null : <LangToggle />;

  return (
    <div className="wrap pp">
      <header className="top">
        <img src="/img/madar-logo.png" alt="مدار Madar" width="120" height="36" />
        <span className="grp">{chk}<span className="badge">{t("badge")}</span></span>
      </header>

      {view === "start" && (
        <section>
          <div className="hero">
            <div className="orbitline"><i /><span>{orbit === "mix" ? t("allOrbits") : t("orbitOf", { n: orbitName(orbit) })}</span></div>
            <h1>{t("ready")}</h1>
            {cfg?.closed && <div className="alertbox" role="status">{t("errClosed")}</div>}
            <p className="lead">{orbit === "mix" ? t("lead") : orbitQuestion(orbit)}</p>
          </div>
          <div className="card">
            <label className="l" htmlFor="name" style={{ marginTop: 0 }}>{t("name")}</label>
            <input className="t" id="name" maxLength={24} autoComplete="nickname" placeholder={t("namePh")} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && start()} />
            <label className="l" htmlFor="phone">{t("phone")}</label>
            <input className="t phone-in" id="phone" type="tel" inputMode="tel" dir="ltr" maxLength={20} autoComplete="tel" placeholder={t("phonePh")} value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && start()} />
            <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>{t("privacy")}</p>
            <label className="l" id="lf">{t("field")}</label>
            <div className="pick two" role="group" aria-labelledby="lf">
              {["ai", "cyber"].map(k => (
                <button key={k} type="button" className="opt-card" aria-pressed={field === k} onClick={() => setField(k)}><b>{fieldName(k)}</b></button>
              ))}
            </div>
            <label className="l" id="ll">{t("level")}</label>
            <div className="pick three" role="group" aria-labelledby="ll">
              {[1, 2, 3].map(l => (
                <button key={l} type="button" className="opt-card" aria-pressed={level === l} onClick={() => setLevel(l)}><b>{levelName(l)}</b><span>{t("nQ", { n: counts[l - 1] })}</span></button>
              ))}
            </div>
            <label className="l" id="lo">{t("orbit")}</label>
            <div className="chips" role="group" aria-labelledby="lo">
              {["mix", ...ORBIT_KEYS].map(k => (
                <button key={k} type="button" className="chip" aria-pressed={orbit === k} onClick={() => setOrbit(k)}>{k === "mix" ? t("all") : orbitName(k)}</button>
              ))}
            </div>
            <div className="err alertbox" role="alert" ref={errRef}>{err}</div>
            <button className="btn block" style={{ marginTop: 12 }} disabled={busy} onClick={start}>{t("start")}</button>
            <div className="row" style={{ marginTop: 10 }}><button className="btn ghost" onClick={() => showBoard("")}>{t("seeBoard")}</button></div>
          </div>
        </section>
      )}

      {view === "quiz" && q && (
        <section>
          <div className="qhead"><span className="num">{t("qOf", { i: q.index, n: q.total })}</span><span className="pts num">{t("pts", { n: score })}</span></div>
          <div className="bar" aria-hidden="true"><div style={{ width: ((q.index - (fb ? 0 : 1)) / q.total * 100) + "%" }} /></div>
          <div className="bar time" style={{ marginTop: 6 }} aria-hidden="true"><div style={{ width: (fb ? 0 : left * 100) + "%" }} /></div>
          <div className="card qcard">
            <div className="qtag"><span>{t("orbitOf", { n: orbitName(q.orbit) })}</span><span className="dots" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= q.lv ? "on" : ""} />)}</span></div>
            <p className="qtext" dir="auto">{q.q}</p>
            <div className="opts" role="group" aria-label={t("optLabel")}>
              {q.o.map((txt, i) => {
                const cls = fb && !fb.lost ? (i === fb.correctChoice ? " ok" : i === picked && !fb.correct ? " no" : "") : "";
                return (
                  <button key={i} type="button" className={"opt" + cls} disabled={!!fb} onClick={() => submit(i)}>
                    <span className="k">{t("letters")[i]}</span><span dir="auto">{txt}</span>
                  </button>
                );
              })}
            </div>
            <div aria-live="polite">
              {fb && fb.lost && <div className="fb bad"><b>{t("lost")}</b>{t("lostMsg")}</div>}
              {fb && !fb.lost && (
                <div className={"fb " + (fb.correct ? "good" : "bad")}>
                  <b>{fb.correct ? t("right", { p: fb.points }) : picked < 0 ? t("timeUp") : t("wrong")}</b>
                  <span dir="auto">{fb.explanation}</span>
                  <small>{t("source")} · <bdi dir="ltr">{stripQ(fb.src)}</bdi></small>
                </div>
              )}
            </div>
            {fb && <button ref={nextRef} className="btn block" style={{ marginTop: 14 }} autoFocus onClick={nextStep}>{fb.lost ? t("newRound") : fb.final ? t("seeResult") : t("next")}</button>}
          </div>
        </section>
      )}

      {view === "result" && fin && <Result f={fin} onAgain={() => { setFin(null); setView("start"); }} onBoard={() => showBoard("")} />}

      {view === "board" && (
        <section>
          <h1>{t("boardTitle")}</h1>
          <p className="lead">{t("boardSub")}</p>
          <div className="chips" style={{ marginBottom: 14 }}>
            {[["", t("all")], ["ai", fieldShort("ai")], ["cyber", fieldShort("cyber")]].map(([k, txt]) => (
              <button key={k} className="chip" aria-pressed={board.field === k} onClick={() => showBoard(k)}>{txt}</button>
            ))}
          </div>
          <ol className="lb">
            {board.rows === false && <li style={{ gridTemplateColumns: "1fr", color: "var(--bad)" }}>{t("boardErr")}</li>}
            {board.rows && board.rows.length === 0 && <li style={{ gridTemplateColumns: "1fr", textAlign: "center", color: "var(--muted)" }}>{t("beFirst")}</li>}
            {board.rows && board.rows.map(r => (
              <li key={r.rank}><span className="rk num">{r.rank}</span><span className="nm">{r.name}<small>{fieldShort(r.field)} · {levelName(r.level)}</small></span><span className="sc num">{r.score}</span></li>
            ))}
          </ol>
          <div className="row"><button className="btn" onClick={() => setView(fin ? "result" : "start")}>{t("back")}</button></div>
        </section>
      )}
    </div>
  );
}

function Result({ f, onAgain, onBoard }) {
  const { t, pick } = useI18n();
  const pct = f.total ? f.correct / f.total : 0;
  const [off, setOff] = useState(326.7);
  useEffect(() => { const id = requestAnimationFrame(() => setOff(326.7 * (1 - pct))); return () => cancelAnimationFrame(id); }, [pct]);
  const rows = [[t("satr"), f.satr], [t("library"), f.library], [t("challenges"), f.challenge]].filter(([, r]) => r && r.url);
  return (
    <section>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="eyebrow">{t("resEyebrow")}</div>
        <h1 style={{ fontSize: 26 }}>{f.name}</h1>
        <div className="ring">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(242,231,221,.12)" strokeWidth="9" /><circle cx="60" cy="60" r="52" fill="none" stroke="#f17233" strokeWidth="9" strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset={off} style={{ transition: "stroke-dashoffset 1s ease" }} /></svg>
          <div className="c"><b className="num">{f.score}</b><span>{t("points")}</span></div>
        </div>
        <p className="lead" style={{ marginTop: 12 }}>{pct >= .85 ? t("msgHigh") : pct >= .6 ? t("msgMid") : t("msgLow")}</p>
        <div className="stats">
          <div className="stat"><b className="num">{t("ofN", { a: f.correct, b: f.total })}</b><span>{t("correct")}</span></div>
          <div className="stat"><b className="num">{t("ofN", { a: f.rank, b: f.participants })}</b><span>{t("rankToday")}</span></div>
          <div className="stat"><b className="num">{fmtTime(f.ms)}</b><span>{t("time")}</span></div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h2>{t("nextStep")}</h2>
        <p className="lead" style={{ marginBottom: 0 }}>{t("nextStepSub")}</p>
        <div>
          {rows.map(([p, r]) => (
            <a key={p} className="rec" href={r.url} target="_blank" rel="noopener noreferrer"><small>{p}</small><b dir="auto">{pick(r.title, r.titleEn)}</b><span dir="auto">{pick(r.why, r.whyEn)}</span></a>
          ))}
        </div>
      </div>
      <div className="row"><button className="btn" onClick={onAgain}>{t("newRound")}</button><button className="btn ghost" onClick={onBoard}>{t("seeBoard")}</button></div>
    </section>
  );
}
