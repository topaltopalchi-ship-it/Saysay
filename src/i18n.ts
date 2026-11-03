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
  "بازگشت": "Back", "ادامه": "Continue", "تأیید": "Confirm", "لغو": "Cancel",
  "نام و نام خانوادگی": "Full name", "شماره تماس": "Phone number", "شماره موبایل": "Mobile number", "آدرس": "Address", "کد": "Code", "کد کالا": "Product code",
  "نام محصول": "Product name", "قیمت خرید": "Purchase price", "قیمت فروش": "Sale price", "قیمت واحد": "Unit price", "جمع کل": "Total", "جمع": "Total",
  "تاریخ ثبت": "Created date", "وضعیت": "Status", "نوع": "Type", "یادداشت": "Note", "یادداشت‌ها": "Notes", "توضیحات بیشتر": "Additional details",
  "مقدار": "Amount", "مقدار موجودی": "Stock quantity", "حداقل موجودی": "Minimum stock", "نام حساب": "Account name", "انتخاب کنید": "Select",
  "هیچ موردی یافت نشد": "No items found", "نتیجه‌ای یافت نشد": "No results found", "موردی یافت نشد": "No items found", "بارگذاری...": "Loading...",
  "خطا": "Error", "موفق": "Success", "عملیات ناموفق بود": "Operation failed", "عملیات با موفقیت انجام شد": "Operation completed successfully",
  "آیا مطمئن هستید؟": "Are you sure?", "تغییرات ذخیره شد": "Changes saved", "ثبت با موفقیت انجام شد": "Saved successfully", "ثبت ناموفق بود": "Save failed",
  "انبار": "Warehouse", "موجودی کالا": "Product inventory", "موجودی واقعی از روی گردش انبار محاسبه می‌شود؛ «حداقل موجودی» فقط آستانه هشدار است.": "Actual stock is calculated from warehouse movements; minimum stock is only an alert threshold.",
  "هنوز کالایی ثبت نشده است.": "No products have been added yet.", "کنترل انبار": "Inventory control", "اصلاح موجودی": "Adjust inventory", "مقدار تغییر": "Change quantity",
  "مثبت برای افزایش، منفی برای کاهش": "Positive to increase, negative to decrease", "شرح": "Description", "ثبت اصلاح موجودی": "Save inventory adjustment",
  "قیمت هوشمند": "Smart pricing", "مشتریان و تأمین‌کنندگان": "Customers and suppliers", "لیست بدهکاران": "Debtors list",
  "فقط فاکتورهای فروش تسویه‌نشده": "Only unsettled sales invoices", "هیچ فاکتور تسویه‌نشده‌ای وجود ندارد.": "No unsettled invoices.",
  "هنوز شخصی ثبت نشده است.": "No people have been added yet.", "مشتری و تأمین‌کننده": "Customer and supplier", "بدون شماره": "No phone number",
  "سفارشات": "Orders", "دریافت و پیگیری سفارش‌ها": "Order intake and tracking", "نام مشتری، کالا، تاریخ تحویل و یادآوری یک روز قبل.": "Customer, product, delivery date, and one-day reminder.",
  "سفارش جدید": "New order", "در انتظار تحویل": "Awaiting delivery", "تحویل شد": "Delivered", "لغو شد": "Cancelled", "در انتظار": "Pending",
  "سفارش‌دهنده:": "Ordered by:", "مقدار:": "Quantity:", "کالا:": "Product:", "تاریخ سفارش:": "Order date:", "تاریخ تحویل:": "Delivery date:", "زمان تحویل:": "Delivery time:",
  "ثبت نشده": "Not set", "بدون یادداشت": "No note", "مبلغ تقریبی": "Approximate amount", "تحویل و ثبت فروش": "Deliver and record sale", "فاکتور فروش ثبت شد": "Sales invoice recorded", "هنوز سفارشی ثبت نشده است.": "No orders yet.",
  "بازه گزارش": "Report range", "انتخاب بازه": "Select range", "بازه فعال:": "Active range:", "امروز": "Today", "۷ روز": "7 days", "۷ روز اخیر": "Last 7 days", "ماه جاری": "Current month", "بازه انتخابی": "Selected range",
  "بهای تمام‌شده": "Cost of goods sold", "سود ناخالص": "Gross profit", "سود خالص": "Net profit", "خالص جریان نقدی": "Net cash flow", "تعداد فروش": "Number of sales",
  "هزینه": "Expense", "خرید و فروش": "Purchases and sales", "گزارش سود و زیان سای‌سای": "SaySay profit and loss report",
  "داشبورد": "Dashboard", "هوش مالی سای‌سای": "SaySay Financial Intelligence", "حساب متصل:": "Connected account:",
  "مدیریت مالی و فروش": "Finance & Sales Management", "واحد پول": "Currency", "فارسی": "Persian", "واحد کاربری": "User mode", "اشتراک فعال": "Active subscription", "اشتراک لازم است": "Subscription required", "دوره رایگان ۳۰ روزه": "30-day free trial",
  "داشبورد مدیریت هوشمند": "Smart Management Dashboard", "۳۰ روز رایگان": "30 days free", "سای‌سای مراقب کسب‌وکار شماست": "SaySay is looking after your business", "برای استفاده از نسخه کامل، اشتراک ماهانه فعال کنید.": "Activate a monthly subscription to use the full version.", "بعد از تأیید موفق پرداخت، دسترسی از سمت سرور فعال می‌شود.": "Access is activated by the server after payment is confirmed.", "خرید اشتراک ماهانه": "Buy monthly subscription",
  "⚠️ کالاهای نیازمند تأمین": "⚠️ Products needing restock", "موجودی به حد هشدار رسیده است": "Stock has reached its alert threshold", "کالا": "Products", "فروش امروز": "Today's sales", "دریافت امروز": "Today's receipts", "مطالبات": "Receivables", "موجودی کم": "Low stock",
  "🧠 مغز سای‌سای": "🧠 SaySay intelligence", "سای‌سای به‌جای نمایش عدد، تصمیم پیشنهادی می‌دهد.": "SaySay recommends actions instead of just showing numbers.", "نکته": "Insights", "فعلاً نکته مهمی پیدا نشد.": "No important insights found right now.",
  "✈️ امروز چه کار کنم؟": "✈️ What should I do today?", "مدیریت هوشمند": "Smart management", "گزارش امروز": "Today's brief", "اولویت‌های کسب‌وکار": "Business priorities", "فروش جدید": "New sale", "ثبت سریع فاکتور": "Quick invoice entry", "افزایش موجودی": "Increase stock", "دریافت وجه": "Receive payment", "پیگیری مطالبات": "Follow up receivables", "قیمت‌های بازار": "Market prices", "نمایش دلار، طلا و شاخص‌ها": "USD, gold, and indices", "فارسی صحبت کنید": "Speak in English", "فروش، قیمت، موجودی": "Sales, prices, inventory", "آخرین تراکنش‌ها": "Recent transactions", "۵ مورد اخیر": "Last 5 entries", "هنوز تراکنشی ثبت نشده است.": "No transactions have been recorded yet.",
  "موجودی رو به اتمام": "Stock running low", "سرمایه خوابیده": "Idle inventory", "افت فروش": "Sales decline", "رشد فروش": "Sales growth", "مشتری نیازمند پیگیری": "Customer follow-up needed", "مطالبه مهم": "Important receivable", "خطر افت سرمایه": "Capital erosion risk", "هزینه‌ها بالا رفته": "Expenses are rising", "تخفیف غیرعادی": "Unusual discount", "پیش‌بینی فروش": "Sales forecast", "کالای پرفروش": "Best-selling product", "تأمین کالا": "Restock product", "پیشنهاد تخفیف": "Suggest discount", "بررسی کالاها و مشتریان": "Review products and customers", "تقویت موجودی پرفروش‌ها": "Restock best sellers", "تماس با مشتری": "Contact customer", "پیگیری دریافت": "Follow up collection", "اصلاح قیمت": "Adjust price", "بررسی هزینه‌ها": "Review expenses", "بررسی فاکتور": "Review invoice", "برنامه‌ریزی خرید": "Plan purchases", "تقویت موجودی": "Increase stock", "بررسی وضعیت": "Review status", "امروز مورد مهمی برای پیگیری پیدا نکردم؛ وضعیت کسب‌وکار پایدار است.": "No important follow-ups today; business status is stable.", "اقدام:": "Action:",
  "حد هشدار:": "Alert threshold:", "تأمین‌کننده:": "Supplier:", "تماس": "Call", "هنوز کالایی ثبت نشده": "No products yet", "برای دریافت پیشنهاد، ابتدا کالا ثبت کنید.": "Add a product to get a recommendation.", "فعلاً نکته مهمی پیدا نشده است.": "No important insights found yet.",

  "از حساب خارج شدید": "You have signed out", "از حساب خارج شوید": "Sign out", "حساب متصل": "Connected account",
  "نمایش گزارش‌ها و ابزارهای مدیریتی؛ این گزینه به‌تنهایی اشتراک پولی را فعال نمی‌کند.": "Show reports and management tools; this option alone does not activate a paid subscription.",
  "نرخ فعلی": "Current rate", "دلار": "USD", "طلا": "Gold", "تغییر شاخص بازار (%)": "Market index change (%)",
  "حاشیه جایگزینی (%)": "Replacement buffer (%)", "سود هدف (%)": "Target margin (%)", "حداقل سود (%)": "Minimum margin (%)",
  "فروش لازم برای نقره‌ای": "Sales required for Silver tier", "فروش لازم برای طلایی": "Sales required for Gold tier",
  "تخفیف نقره‌ای (%)": "Silver discount (%)", "تخفیف طلایی (%)": "Gold discount (%)",
  "این اعداد مبنای پیشنهاد قیمت جایگزینی هستند. نرخ‌ها را از منبع بازار خود به‌روز کنید.": "These values inform replacement-price suggestions. Update rates from your market source.",
  "هوش مالی": "Financial intelligence", "از تاریخ": "From date", "تا تاریخ": "To date",
  "فاکتور فروش": "Sales invoice", "فاکتور خرید": "Purchase invoice", "حذف این فاکتور؟": "Delete this invoice?",
  "این فاکتور فروش حذف شود؟": "Delete this sales invoice?", "این فاکتور خرید حذف شود؟": "Delete this purchase invoice?",
  "این دریافت/پرداخت حذف شود؟": "Delete this receipt/payment?", "این هزینه حذف شود؟": "Delete this expense?",
  "ابتدا یک کالا ثبت کنید": "Please add a product first", "برای انتقال حداقل دو حساب ثبت کنید": "Add at least two accounts to transfer funds", "فاکتور خرید حذف شد": "Purchase invoice deleted", "فاکتور حذف شد": "Invoice deleted",
  "هزینه حذف شد": "Expense deleted", "حذف فاکتور ناموفق بود": "Failed to delete invoice", "حذف ناموفق بود": "Deletion failed",
  "چاپ / PDF در دسترس نیست": "Print / PDF is unavailable", "خروجی Excel ناموفق بود": "Excel export failed",
  "گزارش Excel سای‌سای": "SaySay Excel report",
  "دستیار فروشنده": "Seller assistant", "دستیار فروشنده در دسترس نیست": "Seller assistant is unavailable",
  "پشتیبان": "Backup", "بازیابی": "Restore", "فایل پشتیبان را انتخاب کنید": "Select a backup file",
  "فایل پشتیبان معتبر نیست": "Invalid backup file", "اطلاعات فعلی با این پشتیبان جایگزین می‌شود. ادامه می‌دهید؟": "Current data will be replaced by this backup. Continue?",
  "حذف حساب": "Delete account", "حساب حذف شود؟": "Delete this account?", "شخص حذف شود؟": "Delete this person?",
  "کالا حذف شود؟": "Delete this product?",
  "ثبت صوتی": "Voice entry", "تشخیص صدا در دسترس نیست": "Speech recognition is unavailable", "برای این دستگاه، سرویس تشخیص گفتار فعال نیست.": "Speech recognition is not enabled on this device.", "باشه": "OK",
  "ثبت فروش با صدا": "Record sale by voice", "اطلاعات فروش": "Sale details", "قبل از ثبت، اطلاعات استخراج‌شده را بررسی کنید.": "Review the extracted details before saving.", "متن تشخیص‌داده‌شده": "Recognized text", "تشخیص داده نشد": "Not recognized", "پرداختی": "Paid", "اقلام": "Items", "ادامه ثبت فروش": "Continue sale entry",
  "دستیار آفلاین سای‌سای": "SaySay offline assistant", "درباره موجودی و فروش بپرسید": "Ask about inventory and sales", "پاسخ با اطلاعات ذخیره‌شده روی همین دستگاه محاسبه می‌شود و برای سؤال متنی به اینترنت نیاز ندارد.": "Answers are calculated from data stored on this device. Text questions work offline.", "سؤال شما": "Your question", "مثلاً موجودی دیفوزر چقدر است؟": "For example: How many diffusers are in stock?", "پاسخ بده": "Answer", "لطفاً سؤال را بنویسید.": "Please enter a question.", "در حال بررسی اطلاعات محلی…": "Checking local data…", "پاسخ‌گویی انجام نشد.": "Could not answer.",
  "شنیدن صدا لغو شد": "Voice listening cancelled", "✕ لغو شنیدن": "✕ Cancel listening", "از سای‌سای بپرس": "Ask SaySay", "سؤال خود را نزدیک میکروفون و به فارسی بگویید": "Speak your question close to the microphone in English", "صدایتان واضح تشخیص داده نشد. یک‌بار دیگر نزدیک میکروفون و در محیط آرام سؤال کنید.": "Your speech wasn't clear. Try again near the microphone in a quiet place.",
  "در حال شنیدن…": "Listening…", "🎙 ثبت فروش با صدا": "🎙 Record sale by voice", "🎙 ثبت کالای جدید با صدا": "🎙 Add product by voice", "نام مشتری": "Customer name", "ثبت کالای جدید با صدا": "Add new product by voice",
  "اشتراک سای‌سای": "SaySay subscription",
  "مغز سای‌سای": "SaySay intelligence",
  "امروز چه کار کنم؟": "What should I do today?",
  "کالاهای نیازمند تأمین": "Products needing restock",
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
