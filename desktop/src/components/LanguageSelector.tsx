import { useTranslation } from "react-i18next";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const tr = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
      {tr("language.label", "Idioma")}:
      <select
        value={i18n.language.startsWith("en") ? "en" : "es"}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        style={{
          background: "var(--card, #111)",
          color: "var(--text, #fff)",
          border: "1px solid var(--border, #333)",
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 13,
        }}
      >
        <option value="es">{tr("language.spanish", "Español")}</option>
        <option value="en">{tr("language.english", "English")}</option>
      </select>
    </label>
  );
}
