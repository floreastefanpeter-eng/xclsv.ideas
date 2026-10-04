/** Limbile în care elevul poate primi subtitrările traduse. */
export const LANGUAGES = [
  { code: "ro", label: "Română (original)", native: "Română" },
  { code: "en", label: "Engleză", native: "English" },
  { code: "fr", label: "Franceză", native: "Français" },
  { code: "de", label: "Germană", native: "Deutsch" },
  { code: "es", label: "Spaniolă", native: "Español" },
  { code: "it", label: "Italiană", native: "Italiano" },
  { code: "hu", label: "Maghiară", native: "Magyar" },
  { code: "uk", label: "Ucraineană", native: "Українська" },
  { code: "ru", label: "Rusă", native: "Русский" },
  { code: "ar", label: "Arabă", native: "العربية" },
  { code: "tr", label: "Turcă", native: "Türkçe" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as readonly string[];

export function isLanguage(code: unknown): code is LanguageCode {
  return typeof code === "string" && LANGUAGE_CODES.includes(code);
}

export function languageName(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.native ?? code;
}

/** Limbile scrise de la dreapta la stânga. */
export function isRtl(code: string) {
  return code === "ar";
}
