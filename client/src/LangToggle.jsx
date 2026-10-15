import { useI18n } from "./i18n.jsx";

export default function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <button type="button" className="lang" lang={lang === "ar" ? "en" : "ar"} aria-label={t("lbl")}
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t("langBtn")}</button>
  );
}
