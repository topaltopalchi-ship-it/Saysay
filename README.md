# سای‌سای (SAI SAI)

نرم‌افزار فارسی، موبایل‌محور حسابداری، فروش و مدیریت موجودی برای کسب‌وکارهای ایران.

نام برند محصول: **سای‌سای (SAI SAI)**

واحد پول و تاریخ، گزارش‌ها و رابط کاربری با نیازهای بازار ایران طراحی می‌شوند.

## وضعیت فعلی
نسخه 0.1.0 — پوسته اولیه داشبورد RTL و موبایل‌فرست.

## مسیر توسعه
- داشبورد مالی
- فروش و فاکتور
- خرید
- موجودی و گردش کالا
- اشخاص و حساب‌ها
- دریافت و پرداخت
- هزینه‌ها
- گزارش‌های بازه‌ای
- پشتیبان‌گیری و بازیابی
- آماده‌سازی PWA و سپس بسته‌بندی موبایل

## اصول داده
- ثبت تراکنش‌ها باید قابل ردیابی باشد.
- موجودی از روی گردش‌های ثبت‌شده محاسبه شود.
- مبلغ‌ها با دقت عددی مناسب حسابداری نگهداری شوند.
- تاریخ شمسی در رابط کاربری پشتیبانی شود.
- ساختار برای حالت آفلاین‌اول طراحی شود.

این پروژه مستقل از پروژه PsychGame است.

## اشتراک ماهانه

ساختار اشتراک سای‌سای به‌صورت **server-verified** طراحی شده است؛ یعنی اپلیکیشن به‌تنهایی حق فعال‌کردن اشتراک را ندارد.

### کانال‌های پرداخت

- **نسخه وب/PWA:** درگاه مستقیم از طریق سرور.
- **نسخه کافه‌بازار:** خرید درون‌برنامه‌ای بازار در لایه Android، سپس ارسال purchase token به سرور سای‌سای برای تأیید.
- **نسخه مایکت:** خرید درون‌برنامه‌ای مایکت در لایه Android، سپس ارسال purchase token به سرور برای تأیید.

هر سه مسیر به یک اشتراک ماهانه و یک حساب کاربری متصل می‌شوند.

### وضعیت اتصال کافه‌بازار

- پلن فعال سرور: `monthly`، شناسه محصول `Saysay110`، ۳۰ روز، ۱۰۰٬۰۰۰ تومان.
- اپ اندروید با `capacitor-poolakey` خرید اشتراک را در خود کافه‌بازار آغاز می‌کند.
- توکن خرید فقط پس از دریافت نتیجه موفق به تابع `verify-bazaar-purchase` ارسال می‌شود؛ اشتراک صرفاً با پاسخ تأیید سرور فعال می‌شود.
- وضعیت اشتراک از تابع `subscription-status` خوانده می‌شود.
- سرور باید `CAFEBAZAAR_PISHKHAN_API_SECRET` را در Secrets توابع Supabase داشته باشد؛ این مقدار نباید داخل اپ قرار بگیرد.
- در تنظیمات GitHub Actions، مقدار **کلید عمومی** کافه‌بازار را با نام `CAFEBAZAAR_RSA_PUBLIC_KEY` در Repository Secrets ثبت کنید. این مقدار هنگام ساخت به متغیر `VITE_CAFEBAZAAR_RSA_PUBLIC_KEY` تبدیل می‌شود تا SDK بومی بتواند به بازار متصل شود.
- شناسه محصول باید در پنل توسعه‌دهنده کافه‌بازار دقیقاً با `Saysay110` یکسان باشد و به‌عنوان اشتراک تنظیم شده باشد.

خرید واقعی فقط پس از ثبت کلید عمومی کافه‌بازار در تنظیمات ساخت و تنظیم Secret سمت سرور قابل آزمایش است. هیچ پرداختی در وب شبیه‌سازی نمی‌شود.


---

## English overview

**SAI SAI (SaySay)** is a mobile-first bookkeeping, sales, and inventory application designed around the workflows and conventions of Iranian small businesses.

### Product capabilities

- Sales and purchase invoices with customer/supplier records
- Inventory tracking based on recorded stock movements
- Orders, receipts, payments, expenses, accounts, and checks
- Financial reports and smart pricing tools
- Backup and restore workflows
- Persian-first RTL interface with an English (LTR) language option
- Persian calendar and localized number/date formatting in Persian; Gregorian/English formatting in English
- Voice-assisted product and sales entry with language-aware speech recognition settings
- PWA and Capacitor Android packaging

### Technology

TypeScript, Vite, Capacitor, Supabase, and IndexedDB-oriented local data workflows.

### Subscription integrity

Subscription activation is server-verified. The Cafe Bazaar Android in-app purchase path remains native and sends the purchase token to the backend for verification. The bilingual UI work is intended to preserve this flow; no payment activation is simulated in the web app.

### Build

```bash
npm install
npm run build
`

Configure the required Supabase environment and store credentials/secrets in the appropriate deployment settings. Never commit private keys or purchase verification secrets.

### Localization status

The `feature/bilingual-fa-en` branch introduces a Persian/English selector, dictionary-based UI phrase translation, English speech-recognition configuration and parsing keywords, and language-aware date/number formatting. Coverage is being expanded; untranslated Persian content may still appear in English mode. Run the build and verify the app on web and Android before release.

---
