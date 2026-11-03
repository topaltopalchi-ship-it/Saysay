export type AppLanguage = "fa" | "en";
const LANGUAGE_KEY = "sai-sai-language";

export function getAppLanguage(): AppLanguage {
  return localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "fa";
}

export function setAppLanguage(language: AppLanguage): void {
  localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;
  document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
}

export function t(fa: string, en: string): string {
  return getAppLanguage() === "en" ? en : fa;
}

export function navLabel(id: string, fa: string): string {
  const labels: Record<string, string> = {
    dashboard: "Dashboard", sales: "Sales", purchases: "Purchases",
    orders: "Orders", inventory: "Inventory", people: "People",
    reports: "Reports", more: "Treasury", checks: "Checks"
  };
  return getAppLanguage() === "en" ? (labels[id] ?? fa) : fa;
}
