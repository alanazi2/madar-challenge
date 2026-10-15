import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { store } from "./api.js";

/* كل نصوص الواجهة بالعربية والإنجليزية. الأسئلة تأتي من الخادم بلغة الجولة. */
const D = {
  ar: {
    badge: "منصات طويق", langBtn: "English", lbl: "اللغة",
    // participant
    ready: "مستعد للتحدي؟",
    lead: "اختر مستواك، ودعنا نختبر معلوماتك بأسئلة صُممت خصيصًا لتناسبك.",
    allOrbits: "كل المدارات", orbitOf: "مدار {n}", all: "الكل",
    name: "اسم المشارك", namePh: "مثال: ريم",
    phone: "رقم الجوال (وسيلة التواصل)", phonePh: "05XXXXXXXX",
    privacy: "نستخدم رقمك للتواصل معك بخصوص الفعالية والجوائز فقط، ولا يظهر في لوحة الصدارة.",
    field: "المجال", level: "المستوى", orbit: "المدار",
    nQ: "{n} سؤالًا", start: "ابدأ التحدي", seeBoard: "لوحة الصدارة",
    errName: "اكتب اسمك (حرفان على الأقل).", errPhone: "اكتب رقم جوال صحيحًا (مثال: 05XXXXXXXX).",
    errField: "اختر المجال.", errOrbit: "اختر المدار من الخيارات أعلاه.", errLevel: "اختر المستوى.",
    errClosed: "انتهت جولات اليوم. نراكم غدًا في مدار!", errBusy: "الضغط عالٍ الآن، حاول بعد لحظات.", errStart: "تعذّر البدء. تأكد من الاتصال وحاول مرة أخرى.",
    qOf: "السؤال {i} من {n}", pts: "{n} نقطة", points: "نقطة",
    right: "إجابة صحيحة · +{p} نقطة", timeUp: "انتهى الوقت", wrong: "ليست هذه",
    source: "المصدر: محتوى مدار", next: "التالي", seeResult: "عرض النتيجة", newRound: "جولة جديدة",
    lost: "انقطع الاتصال", lostMsg: "الجلسة لم تعد متاحة. ابدأ جولة جديدة.",
    optLabel: "الخيارات", letters: ["أ", "ب", "ج", "د"],
    resEyebrow: "YOUR ORBIT", correct: "إجابات صحيحة", ofN: "{a} من {b}", rankToday: "ترتيبك اليوم", time: "الزمن",
    msgHigh: "أداء ممتاز! أنت تقود هذا المدار.", msgMid: "جميل! تعرف الكثير، وأمامك تفاصيل تستحق المراجعة.", msgLow: "بداية طيبة. محطات المدار وسطر ستقرّبك أكثر.",
    nextStep: "خطوتك التالية مع منصات طويق", nextStepSub: "اخترناها لك بحسب مجالك ومستواك.",
    satr: "سطر", library: "مكتبة طويق", challenges: "تحديات طويق",
    boardTitle: "لوحة الصدارة", boardSub: "أفضل نتيجة لكل مشارك اليوم.", back: "رجوع", beFirst: "كن أول من يسجّل نتيجة اليوم.", boardErr: "تعذّر تحميل اللوحة.",
    // levels
    lv1: "مبتدئ", lv2: "متوسط", lv3: "متقدم",
    lv1d: "أسئلة مباشرة تبني الأساس", lv2d: "مواقف قصيرة تطبّق فيها ما تعرف", lv3d: "قرارات وفخاخ تحتاج فيها تدقيقًا",
    // fields
    fAi: "الذكاء الاصطناعي وعلم البيانات", fAiS: "الذكاء الاصطناعي والبيانات", fCy: "الوعي والأمن السيبراني", fCyS: "الأمن السيبراني",
    // orbits
    oPos: "الاحتمالات", oIdn: "الهوية", oJdg: "القرار", oTrt: "الحقيقة",
    qPos: "ماذا ستصنع بالذكاء الاصطناعي؟", qIdn: "مَن أنت… في عالم يستطيع نسخك؟", qJdg: "الآلة تقترح… فمن يقرّر؟", qTrt: "صورة حقيقية أم صنعها الذكاء الاصطناعي؟", qMix: "أسئلة من المدارات الأربعة",
    // screen
    tabPlay: "شاشة التحدي", tabBoard: "لوحة الصدارة", tabs: "العروض",
    steps: ["المستوى", "المجال", "المدار", "التحدي", "نتيجتك"],
    s1h1: "إلى أي مدى تصل", s1h2: "معرفتك بالتقنية؟", s1p: "اختر مستواك، ودعنا نختبر معلوماتك بأسئلة صُممت خصيصًا لتناسبك.",
    s2h1: "أيّ مجال", s2h2: "يشدّك أكثر؟", s2p: "على أساسه نقترح عليك خطوتك التالية في منصات طويق.",
    s3h1: "اختر", s3h2: "مدارك", s3p: "من 12 إلى 15 سؤالًا، ولكل سؤال 20 ثانية. الإجابة الصحيحة 100 نقطة، والسرعة تضيف حتى 50.",
    startRound: "ابدأ الجولة", quit: "إنهاء", result: "النتيجة", roundTime: "زمن الجولة",
    scanAny: "امسح أي رمز بجوالك لفتح الصفحة.", resetIn: "تعود الشاشة للبداية بعد {n} ثانية",
    orSign: "أو شارك من جوالك", scanHint: "امسح الرمز بالكاميرا، واكتب اسمك، وابدأ.", qrLabel: "رمز QR لفتح منصة التحدي",
    live: "مباشر", todayP: "مشاركون اليوم", playingNow: "يلعبون الآن",
    boardOrbit: "صدارة مدار {n}", boardOrbitFull: "لوحة صدارة مدار {n}", beFirstHere: "كن أول من يظهر هنا.",
    // admin
    aTitle: "لوحة التحكم", aGate: "دخول المشرفين", aGateSub: "أدخل الرمز السري للوحة.", aPin: "الرمز", aEnter: "دخول", aBadPin: "الرمز غير صحيح.",
    aDay: "اليوم", aAllDays: "كل الأيام", aRefresh: "تحديث", aCsv: "تصدير CSV", aOpenScreen: "فتح شاشة المؤشر",
    aK1: "المشاركون", aK2: "الجولات", aK3: "الإجابات الصحيحة", aK4: "متوسط النقاط",
    aWinners: "متصدّر كل يوم", aCopy: "نسخ الفائزين", aCopied: "تم النسخ", aCopyFail: "تعذّر النسخ", aWinCsv: "تصدير الفائزين CSV", aPrint: "طباعة",
    aWinSub: "أفضل 3 لكل يوم (أفضل جولة لكل مشارك) مع رقم التواصل. اليوم المفتوح يُحدَّث مباشرة، ويثبت بعد انتهائه.",
    aOpen: "مفتوح الآن", aPeople: "{a} مشارك · {b} جولة", aNoPhone: "بدون رقم", aNoResults: "لا نتائج بعد.",
    aByOrbit: "حسب المدار", aByField: "حسب المجال", aByLevel: "حسب المستوى", aByHour: "الجولات بحسب الساعة", aNoData: "لا بيانات بعد.",
    aHard: "أصعب الأسئلة", aHardSub: "أقل نسبة إجابة صحيحة (٣ محاولات فأكثر).", aQ: "السؤال", aOk: "صحيح", aNotEnough: "لا بيانات كافية بعد.",
    aQrTitle: "رمز QR لكل مدار", aQrSub: "ضع الرمز المناسب على شاشة كل محطة. الجوال يفتح المنصة على المدار نفسه. أدخل هنا رابط الاستضافة العام إن اختلف عن عنوان هذه الصفحة.",
    aSaveUrl: "حفظ الرابط", aSaved: "تم الحفظ", aBadUrl: "رابط غير صالح (http/https)", aHomePage: "الصفحة الرئيسية",
    aPlat: "لون شارة «منصات طويق»", aPlatSub: "نص الشارة ثابت. هنا تختار لون المنصة التي تظهر في ركن الصفحات.",
    aPlatNames: { none: "مدار (افتراضي)", challenges: "تحديات طويق", satr: "سطر", library: "مكتبة طويق" },
    aLast: "آخر الجولات", aLastSub: "أخفِ أي اسم غير لائق من اللوحة.", aHide: "إخفاء", aShow: "إظهار", aNoRounds: "لا جولات بعد.",
    aRecs: "توصيات منصات طويق", aRecsSub: "تظهر للمتسابق في نهاية الجولة. الروابط https فقط.", aSaveRecs: "حفظ التوصيات", aBadRecs: "تحقق من الروابط (https).",
    aRecNames: { "satr-ai": "سطر · الذكاء الاصطناعي", "satr-cyber": "سطر · الأمن السيبراني", "library-pos": "مكتبة طويق · الاحتمالات", "library-default": "مكتبة طويق · عام", challenge: "تحديات طويق" },
    aPartial: "تعذّر تحميل جزء من البيانات. غالبًا الخادم يعمل بنسخة أقدم من الواجهة: أوقفه وشغّله من مجلد النسخة الجديدة ثم حدّث الصفحة.", aEndDay: "إنهاء اليوم", aEndConfirm: "تأكيد إنهاء اليوم", aEndNote: "بعد الإنهاء لن تُقبل جولات جديدة اليوم، ويظهر تقرير المشاركين كاملًا مع أرقام التواصل.", aCancel: "إلغاء",
    aReopen: "إعادة فتح اليوم", aClosed: "اليوم مُغلق", aClosedAt: "أُغلق في {t}", aDayOpen: "اليوم مفتوح",
    aReport: "تقرير اليوم · كل المشاركين", aReportSub: "أفضل نتيجة لكل مشارك مع رقم التواصل. الثلاثة الأوائل مظللون.", aExportDay: "تصدير تقرير اليوم CSV",
    aColName: "الاسم", aColPhone: "الجوال", aColField: "المجال", aColScore: "النقاط", aColCorrect: "الصحيحة", aColRounds: "الجولات", aNoParticipants: "لا مشاركين في هذا اليوم.",
    aTitleAr: "العنوان (عربي)", aTitleEn: "العنوان (English)", aUrl: "الرابط", aWhyAr: "السبب (عربي)", aWhyEn: "السبب (English)",
  },
  en: {
    badge: "Tuwaiq Platforms", langBtn: "العربية", lbl: "Language",
    ready: "Ready for the challenge?",
    lead: "Choose your level and let us test what you know with questions designed to fit you.",
    allOrbits: "All orbits", orbitOf: "{n} Orbit", all: "All",
    name: "Participant name", namePh: "e.g. Reem",
    phone: "Mobile number (contact)", phonePh: "05XXXXXXXX",
    privacy: "We use your number only to contact you about the event and prizes. It never appears on the leaderboard.",
    field: "Field", level: "Level", orbit: "Orbit",
    nQ: "{n} questions", start: "Start the challenge", seeBoard: "Leaderboard",
    errName: "Enter your name (at least 2 characters).", errPhone: "Enter a valid mobile number (e.g. 05XXXXXXXX).",
    errField: "Choose a field.", errOrbit: "Pick an orbit from the options above.", errLevel: "Choose a level.",
    errClosed: "Today's rounds have ended. See you tomorrow at Madar!", errBusy: "Heavy traffic right now. Please try again in a moment.", errStart: "Couldn't start. Check your connection and try again.",
    qOf: "Question {i} of {n}", pts: "{n} pts", points: "pts",
    right: "Correct · +{p} pts", timeUp: "Time's up", wrong: "Not this one",
    source: "Source: Madar content", next: "Next", seeResult: "See result", newRound: "New round",
    lost: "Connection lost", lostMsg: "The session is no longer available. Start a new round.",
    optLabel: "Options", letters: ["A", "B", "C", "D"],
    resEyebrow: "YOUR ORBIT", correct: "Correct answers", ofN: "{a} of {b}", rankToday: "Your rank today", time: "Time",
    msgHigh: "Excellent! You're leading this orbit.", msgMid: "Nice! You know a lot, and a few details deserve another look.", msgLow: "A good start. The orbit stations and Satr will take you further.",
    nextStep: "Your next step with Tuwaiq platforms", nextStepSub: "Picked for you based on your field and level.",
    satr: "Satr", library: "Tuwaiq Library", challenges: "Tuwaiq Challenges",
    boardTitle: "Leaderboard", boardSub: "Each participant's best score today.", back: "Back", beFirst: "Be the first to post a score today.", boardErr: "Couldn't load the leaderboard.",
    lv1: "Beginner", lv2: "Intermediate", lv3: "Advanced",
    lv1d: "Direct questions that build the basics", lv2d: "Short scenarios to apply what you know", lv3d: "Decisions and traps that need a careful eye",
    fAi: "AI & Data Science", fAiS: "AI & Data", fCy: "Cybersecurity Awareness", fCyS: "Cybersecurity",
    oPos: "Possibility", oIdn: "Identity", oJdg: "Judgment", oTrt: "Truth",
    qPos: "What will you build with AI?", qIdn: "Who are you… in a world that can copy you?", qJdg: "The machine suggests… so who decides?", qTrt: "A real photo, or made by AI?", qMix: "Questions from all four orbits",
    tabPlay: "Challenge screen", tabBoard: "Leaderboard", tabs: "Views",
    steps: ["Level", "Field", "Orbit", "Challenge", "Your result"],
    s1h1: "How far does your", s1h2: "tech knowledge go?", s1p: "Choose your level and let us test what you know with questions designed to fit you.",
    s2h1: "Which field", s2h2: "pulls you most?", s2p: "We'll suggest your next step on Tuwaiq platforms based on it.",
    s3h1: "Pick your", s3h2: "orbit", s3p: "12 to 15 questions, 20 seconds each. A correct answer is worth 100 points, and speed adds up to 50.",
    startRound: "Start round", quit: "End", result: "Result", roundTime: "Round time",
    scanAny: "Scan any code with your phone to open the page.", resetIn: "The screen returns to the start in {n} s",
    orSign: "Or join from your phone", scanHint: "Scan the code with your camera, enter your name, and start.", qrLabel: "QR code to open the challenge platform",
    live: "Live", todayP: "Players today", playingNow: "Playing now",
    boardOrbit: "{n} Orbit leaders", boardOrbitFull: "{n} Orbit leaderboard", beFirstHere: "Be the first to appear here.",
    aTitle: "Dashboard", aGate: "Admin sign-in", aGateSub: "Enter the dashboard PIN.", aPin: "PIN", aEnter: "Sign in", aBadPin: "Incorrect PIN.",
    aDay: "Day", aAllDays: "All days", aRefresh: "Refresh", aCsv: "Export CSV", aOpenScreen: "Open station screen",
    aK1: "Participants", aK2: "Rounds", aK3: "Correct answers", aK4: "Average score",
    aWinners: "Daily leaders", aCopy: "Copy winners", aCopied: "Copied", aCopyFail: "Copy failed", aWinCsv: "Export winners CSV", aPrint: "Print",
    aWinSub: "Top 3 per day (each participant's best round) with contact numbers. The open day updates live and is final once it ends.",
    aOpen: "Open now", aPeople: "{a} participants · {b} rounds", aNoPhone: "No number", aNoResults: "No results yet.",
    aByOrbit: "By orbit", aByField: "By field", aByLevel: "By level", aByHour: "Rounds by hour", aNoData: "No data yet.",
    aHard: "Hardest questions", aHardSub: "Lowest correct rate (3+ attempts).", aQ: "Question", aOk: "Correct", aNotEnough: "Not enough data yet.",
    aQrTitle: "QR code per orbit", aQrSub: "Place the matching code on each station screen. Phones open the platform on the same orbit. Enter the public hosting URL here if it differs from this page's address.",
    aSaveUrl: "Save URL", aSaved: "Saved", aBadUrl: "Invalid URL (http/https)", aHomePage: "Home page",
    aPlat: "“Tuwaiq Platforms” badge color", aPlatSub: "The badge text is fixed. Pick the platform color shown in the page corner.",
    aPlatNames: { none: "Madar (default)", challenges: "Tuwaiq Challenges", satr: "Satr", library: "Tuwaiq Library" },
    aLast: "Latest rounds", aLastSub: "Hide any inappropriate name from the board.", aHide: "Hide", aShow: "Show", aNoRounds: "No rounds yet.",
    aRecs: "Tuwaiq platform recommendations", aRecsSub: "Shown to the participant at the end of a round. https links only.", aSaveRecs: "Save recommendations", aBadRecs: "Check the links (https).",
    aRecNames: { "satr-ai": "Satr · AI", "satr-cyber": "Satr · Cybersecurity", "library-pos": "Tuwaiq Library · Possibility", "library-default": "Tuwaiq Library · General", challenge: "Tuwaiq Challenges" },
    aPartial: "Part of the data failed to load. The server is probably running an older version than the page: stop it, run it from the new version's folder, then refresh.", aEndDay: "End the day", aEndConfirm: "Confirm: end the day", aEndNote: "After ending, no new rounds are accepted today, and the full participant report with contact numbers is shown.", aCancel: "Cancel",
    aReopen: "Reopen the day", aClosed: "Day closed", aClosedAt: "Closed at {t}", aDayOpen: "Day open",
    aReport: "Day report · all participants", aReportSub: "Each participant's best result with contact number. The top three are highlighted.", aExportDay: "Export day report CSV",
    aColName: "Name", aColPhone: "Mobile", aColField: "Field", aColScore: "Score", aColCorrect: "Correct", aColRounds: "Rounds", aNoParticipants: "No participants on this day.",
    aTitleAr: "Title (Arabic)", aTitleEn: "Title (English)", aUrl: "Link", aWhyAr: "Why (Arabic)", aWhyEn: "Why (English)",
  },
};

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "ar" || q === "en") return q;
    return store("madar_lang") === "en" ? "en" : "ar";
  });
  const setLang = useCallback(l => { setLangState(l); store("madar_lang", l); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = lang === "ar" ? "مدار · منصة التحدي" : "Madar · Challenge";
  }, [lang]);
  const value = useMemo(() => {
    const dict = D[lang];
    const t = (k, vars) => {
      let s = dict[k] ?? D.ar[k] ?? k;
      if (vars && typeof s === "string") for (const [a, b] of Object.entries(vars)) s = s.replaceAll("{" + a + "}", b);
      return s;
    };
    const orbitKey = { pos: "oPos", idn: "oIdn", jdg: "oJdg", trt: "oTrt", mix: "allOrbits" };
    const orbitQ = { pos: "qPos", idn: "qIdn", jdg: "qJdg", trt: "qTrt", mix: "qMix" };
    const fieldKey = { ai: "fAi", cyber: "fCy" };
    return {
      lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr",
      orbitName: k => t(orbitKey[k]),
      orbitQuestion: k => t(orbitQ[k]),
      fieldName: k => t(fieldKey[k]),
      fieldShort: k => t(fieldKey[k] + "S"),
      levelName: l => t("lv" + l),
      num: n => String(n),
      pick: (ar, en) => (lang === "en" && en ? en : ar),
    };
  }, [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);

export const ORBIT_META = {
  pos: { en: "POSSIBILITY", n: "01" }, idn: { en: "IDENTITY", n: "02" },
  jdg: { en: "JUDGMENT", n: "03" }, trt: { en: "TRUTH", n: "04" }, mix: { en: "MIX", n: "" },
};
export const ORBIT_KEYS = ["pos", "idn", "jdg", "trt"];
