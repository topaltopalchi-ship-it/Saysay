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

// Exact UI phrase translations. Unmapped content remains Persian instead of being
// guessed, which is safer for customer/product names and financial data.
const phrases: Record<string, string> = {
  "تنظیمات": "Settings", "تنظیمات پایه": "Basic settings", "تنظیمات سای‌سای": "SaySay settings",
  "واحد نمایش مبلغ": "Currency display", "تومان": "Toman", "ریال": "Rial",
  "حالت حرفه‌ای": "Professional mode", "ذخیره و اعمال": "Save and apply",
  "ذخیره تنظیمات": "Save settings", "بستن": "Close", "ذخیره": "Save", "ویرایش": "Edit", "حذف": "Delete",
  "ثبت فروش": "Add sale", "ثبت خرید": "Add purchase", "ثبت کالا": "Add product",
  "ثبت شخص": "Add person", "ثبت هزینه": "Add expense", "ثبت حساب": "Add account",
  "فروش": "Sales", "خرید": "Purchases", "دفتر فروش": "Sales ledger", "دفتر خرید": "Purchase ledger",
  "فاکتورهای فروش و مانده مشتریان.": "Sales invoices and customer balances.",
  "خریدها و افزایش خودکار موجودی.": "Purchases and automatic stock increases.",
  "هنوز فاکتور فروشی ثبت نشده است.": "No sales invoices yet.",
  "هنوز خریدی ثبت نشده است.": "No purchases yet.",
  "موجودی": "Inventory", "اشخاص": "People", "گزارش‌ها": "Reports", "خزانه": "Treasury", "چک‌ها": "Checks",
  "این بخش در حال تکمیل است": "This section is under development",
  "زیرساخت اصلی آماده است و قابلیت‌های تکمیلی در نسخه‌های بعدی اضافه می‌شوند.": "Core infrastructure is ready. More features will arrive in future versions.",
  "مدیریت اشتراک": "Manage subscription", "ورود / ساخت حساب": "Sign in / Create account",
  "خروج از حساب": "Sign out", "بدون حساب کاربری؛ برای بررسی اشتراک وارد حساب شوید.": "No account. Sign in to check your subscription.",
  "واحد مبلغ ذخیره شد": "Currency unit saved", "حساب حذف شد": "Account deleted",
  "شخص حذف شد": "Person deleted", "کالا حذف شد": "Product deleted", "ثبت حذف شد": "Record deleted",
  "فایل پشتیبان آماده شد": "Backup file is ready", "بازیابی با موفقیت انجام شد": "Restore completed successfully",
  "دریافت قیمت زنده": "Get live prices", "قیمت دلار، طلا و سکه": "USD, gold and coin prices",
  "قیمت‌گذاری و حفظ سرمایه": "Pricing and capital preservation", "اطلاعات بازار": "Market data",
  "مشتری": "Customer", "تأمین‌کننده": "Supplier", "نام": "Name", "توضیحات": "Description",
  "مبلغ": "Amount", "تاریخ": "Date", "تعداد": "Quantity", "قیمت": "Price", "مانده": "Balance",
  "جستجو": "Search", "فیلتر": "Filter", "همه": "All", "پرداخت": "Payment", "دریافت": "Receipt",
  "افزودن": "Add", "ثبت": "Create", "شماره": "Number", "نام کالا": "Product name",
  "نام شخص": "Person name", "موجودی فعلی": "Current stock", "واحد": "Unit",
  "بازگشت": "Back", "ادامه": "Continue", "تأیید": "Confirm", "لغو": "Cancel"
};

export function translateRenderedUi(root: ParentNode = document): void {
  if (getAppLanguage() !== "en") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const original = node.nodeValue ?? "";
    const trimmed = original.trim();
    const translated = phrases[trimmed];
    if (translated) node.nodeValue = original.replace(trimmed, translated);
  }
  root.querySelectorAll<HTMLElement>("input[placeholder],textarea[placeholder],button[title],[aria-label]").forEach(el => {
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const value = el.getAttribute(attr);
      if (value && phrases[value]) el.setAttribute(attr, phrases[value]);
    }
  });
}
