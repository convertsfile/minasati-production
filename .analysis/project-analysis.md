# تقرير تحليل مشروع EduPlatform (منصاتي)

> تاريخ التحليل: 2026-04-30  
> الإصدار: 1.0

---

## 1. نظرة عامة

**منصاتي (Minassati)** هي منصة تعليمية سحابية موجهة لسوق التعليم المصري، تتيح للطلاب الاشتراك في كورسات تعليمية ومشاهدة محاضرات مرئينية محمية بنظام DRM مخصص مع علامات مائية جنائية متحركة. تعتمد المنصة على نموذج اشتراك مدفوع عبر نظام نقاط (1 جنيه = 1 نقطة) مع دعم لطرق دفع محلية (InstaPay، Vodafone Cash). يتميز المشروع بنظام تسلسلي لفتح المحاضرات مرتبط بنتائج الامتحانات، ونظام حماية مضاد للقرصنة يشمل كشف لقطات الشاشة والتسجيل.

### المكد التقني

| المكوّن | التقنية |
|---------|---------|
| Backend | Laravel 12 (PHP 8.2+) مع Sanctum |
| Frontend | Next.js 16 مع TypeScript (strict) |
| قاعدة البيانات | MySQL 8.0+ (SQLite للاختبار المحلي) |
| تخزين الملفات | Cloudinary (صور الهوية وإثباتات الدفع) |
| تخزين الفيديو | Backblaze B2 (حاوية خاصة) |
| CDN | Cloudflare (Bandwidth Alliance) |
| ترميز الفيديو | FFmpeg (ترميز محلي + علامة مائية متحركة) |
| مشغّل الفيديو | HTML5 Video Player |
| SMS/OTP | Twilio |
| المدفوعات | InstaPay + Vodafone Cash (يدوي مع مراجعة أدمن) |
| Webhooks | Fawry + Vodafone Cash |
| النشر | Vercel (لم يُنشر بعد) |

### حالة المشروع

المشروع في مرحلة تطوير نشطة. المmilestones من 1 إلى 6 مكتملة (مع بعض المهام غير المنجزة في Milestone 1 المتعلقة بالنشر). Milestone 7 (الامتحانات) مكتمل جزئياً (قاعدة البيانات والـ API الجزئي). Milestones 8-10 لم تُبدأ بعد.

---

## 2. كيفية التشغيل

### 2.1 المتطلبات الأساسية

- PHP 8.2+
- Node.js 18+
- MySQL 8.0+ (أو SQLite للتطوير المحلي — ملف `database/database.sqlite` موجود)
- Composer
- FFmpeg مثبّت على النظام (لترميز الفيديو)

### 2.2 إعداد الـ Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

تشغيل عامل الطابور (مطلوب لترميز الفيديو):

```bash
php artisan queue:listen --tries=1
```

أو استخدام السكربت الجاهز:

```powershell
.\start-server.ps1
```

### 2.3 إعداد الـ Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

المنفذ الافتراضي: `3002` (كما هو محدد في `package.json`)

### 2.4 متغيرات البيئة المطلوبة

#### Backend (.env)

| المتغير | الوصف | مطلوب؟ |
|---------|-------|--------|
| `DB_CONNECTION` | نوع قاعدة البيانات (mysql/sqlite) | نعم |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | بيانات اتصال MySQL | نعم (إذا mysql) |
| `CLOUDINARY_CLOUD_NAME` | اسم سحابة Cloudinary | نعم |
| `CLOUDINARY_API_KEY` | مفتاح Cloudinary | نعم |
| `CLOUDINARY_API_SECRET` | سر Cloudinary | نعم |
| `TWILIO_ACCOUNT_SID` | معرّف حساب Twilio | نعم |
| `TWILIO_AUTH_TOKEN` | رمز مصادقة Twilio | نعم |
| `TWILIO_PHONE_NUMBER` | رقم هاتف Twilio | نعم |
| `CORS_ALLOWED_ORIGINS` | النطاقات المسموحة (مثل: http://localhost:3000) | نعم |
| `FAWRY_MERCHANT_CODE` | رمز تاجر Fawry | لاحقاً |
| `FAWRY_API_KEY` | مفتاح Fawry | لاحقاً |
| `FAWRY_SECRET_KEY` | سر Fawry | لاحقاً |
| `VODAFONE_CASH_MERCHANT_CODE` | رمز تاجر Vodafone Cash | لاحقاً |
| `VODAFONE_CASH_API_KEY` | مفتاح Vodafone Cash | لاحقاً |
| `VODAFONE_CASH_SECRET_KEY` | سر Vodafone Cash | لاحقاً |

ملاحظة: متغيرات Backblaze B2 غير موجودة في `.env.example` لكنها مطلوبة فعلياً (يستخدمها `BackblazeStorageService`). يجب إضافتها يدوياً.

#### Frontend (.env.local)

| المتغير | الوصف |
|---------|-------|
| `NEXT_PUBLIC_API_URL` | رابط API الـ backend (مثل: http://localhost:8000) |

### 2.5 تهيئة قاعدة البيانات

```bash
cd backend
php artisan migrate
```

لتشغيل البيانات التجريبية:

```bash
php artisan db:seed --class=TestUserSeeder
```

### 2.6 الحسابات التجريبية

بعد تشغيل `TestUserSeeder`:

| الدور | البريد الإلكتروني | كلمة المرور | الحالة |
|------|-------------------|-------------|--------|
| أدمن | admin@eduplatform.test | admin123 | active |
| طالب نشط | student@eduplatform.test | student123 | active |
| طالب معلّق | pending@eduplatform.test | pending123 | pending |
| طالب مرفوض | rejected@eduplatform.test | rejected123 | rejected |

**ملاحظة مهمة:** الـ Seeder يستخدم حقول `id_number` و `is_admin` كأعمدة مباشرة، لكن المايكريشن يستخدم `role` كـ enum (`student`/`admin`) مع `is_admin` كـ boolean. قد يحدث تعارض.

---

## 3. خريطة الـ Frontend

### 3.1 الصفحات العامة (Public)

| المسار | الملف | الوصف الوظيفي |
|--------|-------|---------------|
| `/` | `app/page.tsx` | الصفحة الرئيسية — عرض أحدث الكورسات، مميزات المنصة، أزرار تسجيل/دخول |
| `/login` | `app/login/page.tsx` | تسجيل الدخول — نموذج بريد إلكتروني + كلمة مرور |
| `/register` | `app/register/page.tsx` | إنشاء حساب — نموذج متعدد الحقول + رفع صورة الهوية |
| `/otp` | `app/otp/page.tsx` | التحقق من OTP — إدخال 6 أرقام مع عدّاد تنازلي وإعادة إرسال |

### 3.2 صفحات المصادقة والانتظار

| المسار | الملف | الوصف الوظيفي |
|--------|-------|---------------|
| `/waiting-room` | `app/waiting-room/page.tsx` | غرفة الانتظار — فحص حالة الحساب عند التحميل وعند العودة للتبويب |
| `/resubmit` | `app/resubmit/page.tsx` | إعادة إرسال المستندات — للطلاب المرفوضين (رفع صورة هوية جديدة) |
| `/blocked` | `app/blocked/page.tsx` | صفحة الحظر — للطلاب المحظورين بسبب انتهاكات الفيديو |

### 3.3 لوحة الطالب

| المسار | الملف | الوصف الوظيفي |
|--------|-------|---------------|
| `/courses` | `app/courses/page.tsx` | قائمة الكورسات — عرض الكورسات المتاحة والمشتراة |
| `/courses/[id]` | `app/courses/[id]/page.tsx` | تفاصيل كورس — معلومات الكورس، قائمة المحاضرات، زر الشراء |
| `/lectures/[id]` | `app/lectures/[id]/page.tsx` | مشاهدة محاضرة — مشغّل فيديو مع حماية مضادة للقرصنة |
| `/exams/[id]` | `app/exams/[id]/page.tsx` | تقديم امتحان — أسئلة MCQ مع مؤقت تنازلي |
| `/wallet` | `app/wallet/page.tsx` | المحفظة — عرض الرصيد وسجل المعاملات وشف التعبئة |
| `/redeem` | `app/redeem/page.tsx` | استبدال كود — إدخال كود مركزي للحصول على كورس |

### 3.4 لوحة تحكم الأدمن

| المسار | الملف | الوصف الوظيفي |
|--------|-------|---------------|
| `/admin` | `app/admin/page.tsx` | لوحة التحكم الرئيسية — إحصائيات عامة ووصول سريع |
| `/admin/pending-students` | `app/admin/pending-students/page.tsx` | الطلاب المعلّقين — مراجعة وقبول/رفض مع سبب الرفض |
| `/admin/students` | `app/admin/students/page.tsx` | إدارة الطلاب — قائمة بجميع الطلاب مع فلترة بالحالة |
| `/admin/courses` | `app/admin/courses/page.tsx` | إدارة الكورسات — CRUD كامل للكورسات |
| `/admin/courses/[id]/lectures` | `app/admin/courses/[id]/lectures/page.tsx` | إدارة المحاضرات — CRUD + ترتيب + رفع فيديو |
| `/admin/courses/[id]/exams` | `app/admin/courses/[id]/exams/page.tsx` | إدارة الامتحانات — إنشاء أشكال امتحانية وإضافة أسئلة |
| `/admin/center-codes` | `app/admin/center-codes/page.tsx` | أكواد المراكز — توليد وعرض وتصدير الأكواد |
| `/admin/topups` | `app/admin/topups/page.tsx` | طلبات الشحن — مراجعة إثباتات الدفع وقبول/تعديل/رفض |
| `/admin/wallet` | `app/admin/wallet/page.tsx` | إدارة المحفظة — عرض تفاصيل الشحن |
| `/admin/wallet-stats` | `app/admin/wallet-stats/page.tsx` | إحصائيات المحفظة — ملخص مالي |
| `/admin/payment-numbers` | `app/admin/payment-numbers/page.tsx` | أرقام الدفع — إدارة أرقام InstaPay/Vodafone Cash |
| `/admin/security` | `app/admin/security/page.tsx` — تنبيهات الأمان — عرض انتهاكات الفيديو وحظر الطلاب |

### 3.5 المكوّنات المشتركة

| المكوّن | الملف | الوصف |
|---------|-------|-------|
| VideoPlayer | `components/VideoPlayer.tsx` | مشغّل فيديو مع حماية (كشف لقطة شاشة، تسجيل، علامة مائية متحركة) |

### 3.6 الإعدادات العامة للواجهة

- **اللغة:** عربية (RTL) — `<html lang="ar" dir="rtl">`
- **الخطوط:** Plus Jakarta Sans (عناوين)، Manrope (نصوص)، Inter (تسميات)
- **الألوان:** Primary `#006591`، Primary Light `#0ea5e9`، Surface `#ffffff`، Background `#f7f9ff`، Text `#001e30`
- **CSS:** Tailwind CSS 4 مع متغيرات CSS مخصصة في `globals.css`
- **لا يوجد** `next.config` مخصص (لا يوجد ملف next.config.js/ts)

---

## 4. خريطة الـ Backend API

### 4.1 نقاط عامة (بدون مصادقة)

| Method | Endpoint | Controller@Action | الوصف |
|--------|----------|-------------------|-------|
| GET | `/api/health` | Closure | فحص حالة الخادم |
| GET | `/api/test-settings` | Closure | عرض إعدادات PHP (للتشخيص) |
| GET | `/api/courses/latest` | `Admin\CourseController@latest` | أحدث 6 كورسات (عام) |

### 4.2 المصادقة (Auth)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| POST | `/api/auth/register` | `AuthController@register` | — | تسجيل حساب جديد + إرسال OTP |
| POST | `/api/auth/verify-otp` | `AuthController@verifyOtp` | — | التحقق من OTP وإنشاء الحساب |
| POST | `/api/auth/resend-otp` | `AuthController@resendOtp` | — | إعادة إرسال OTP |
| POST | `/api/auth/login` | `AuthController@login` | — | تسجيل الدخول (إبطال الرموز السابقة) |
| POST | `/api/auth/logout` | `AuthController@logout` | auth:sanctum | تسجيل الخروج (حذف جميع الرموز) |
| GET | `/api/auth/me` | `AuthController@me` | auth:sanctum | بيانات المستخدم الحالي |
| GET | `/api/auth/status` | `AuthController@status` | auth:sanctum | حالة الحساب (لغرفة الانتظار) |
| POST | `/api/auth/resubmit` | `AuthController@resubmit` | auth:sanctum | إعادة إرسال مستندات (للمرفوضين) |

### 4.3 المحفظة (Wallet)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| GET | `/api/wallet/balance` | `WalletController@balance` | auth:sanctum | عرض رصيد المحفظة |
| GET | `/api/wallet/transactions` | `WalletController@transactions` | auth:sanctum | سجل المعاملات |
| POST | `/api/wallet/top-up` | `WalletController@createTopUp` | auth:sanctum | إنشاء طلب شحن (Fawry/VF Cash) |
| GET | `/api/wallet/topup/initiate` | `WalletTopupController@initiate` | auth:sanctum | الحصول على رقم دفع (InstaPay/VF Cash) |
| POST | `/api/wallet/topup/submit` | `WalletTopupController@submit` | auth:sanctum | رفع إثبات الدفع + المبلغ |
| GET | `/api/wallet/topup/status` | `WalletTopupController@status` | auth:sanctum | حالة طلبات الشحن المعلّقة |
| GET | `/api/wallet/topup/history` | `WalletTopupController@history` | auth:sanctum | سجل طلبات الشحن |

### 4.4 الكورسات (Student)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| GET | `/api/courses` | `Student\CourseController@index` | auth:sanctum | قائمة الكورسات (مع علامة الشراء) |
| GET | `/api/courses/my-courses` | `Student\CourseController@myCourses` | auth:sanctum | كورساتي المشتراة |
| GET | `/api/courses/{course}` | `Student\CourseController@show` | auth:sanctum | تفاصيل كورس + محاضراته |
| POST | `/api/courses/{course}/purchase` | `Student\CourseController@purchase` | auth:sanctum | شراء كورس بالنقاط + تشغيل ترميز الفيديو |
| GET | `/api/courses/{course}/encoding-status` | `Student\VideoEncodingController@courseStatus` | auth:sanctum | حالة ترميز فيديوهات الكورس |

### 4.5 المحاضرات والفيديو (Student)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| GET | `/api/lectures/{lecture}/playback` | `Student\VideoPlaybackController@getPlaybackUrl` | auth:sanctum | الحصول على رابط تشغيل موقّع (4 ساعات) |
| POST | `/api/lectures/{lecture}/violations` | `Student\VideoViolationController@log` | auth:sanctum | تسجيل انتهاك فيديو |
| GET | `/api/lectures/{lectureId}/encoding-status` | `Student\VideoEncodingController@lectureStatus` | auth:sanctum | حالة ترميز محاضرة معينة |
| POST | `/api/lectures/{lectureId}/retry-encoding` | `Student\VideoEncodingController@retryEncoding` | auth:sanctum | إعادة محاولة ترميز فاشل |
| GET | `/api/violations/count` | `Student\VideoViolationController@count` | auth:sanctum | عدّاد الانتهاكات للطالب |

### 4.6 الامتحانات (Student)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| GET | `/api/lectures/{lecture}/exam` | `Student\ExamController@getExam` | auth:sanctum | الحصول على الامتحان المتاح (3 أشكال احتياطية) |
| POST | `/api/lectures/{lecture}/exam/{exam}/submit` | `Student\ExamController@submitExam` | auth:sanctum | تقديم إجابات الامتحان |
| GET | `/api/lectures/{lecture}/exam/history` | `Student\ExamController@getHistory` | auth:sanctum | سلة محاولات الامتحان |

### 4.7 أكواد المراكز (Student)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| POST | `/api/center-codes/redeem` | `Student\CenterCodeController@redeem` | auth:sanctum | استبدال كود مركزي للحصول على كورس |

### 4.8 Webhooks (بدون مصادقة)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| POST | `/api/webhooks/fawry` | `FawryController@webhook` | — | استقبال إشعار دفع Fawry |
| POST | `/api/webhooks/vodafone-cash` | `VodafoneCashController@webhook` | — | استقبال إشعار دفع Vodafone Cash |

### 4.9 إدارة الأدمن (Admin)

| Method | Endpoint | Controller@Action | Middleware | الوصف |
|--------|----------|-------------------|-----------|-------|
| GET | `/api/admin/users/pending` | `AdminUserController@pendingUsers` | auth:sanctum + admin | قائمة الطلاب المعلّقين |
| POST | `/api/admin/users/{id}/approve` | `AdminUserController@approveUser` | auth:sanctum + admin | قبول طالب |
| POST | `/api/admin/users/{id}/reject` | `AdminUserController@rejectUser` | auth:sanctum + admin | رفض طالب مع سبب |
| GET | `/api/admin/users` | `AdminUserController@allUsers` | auth:sanctum + admin | جميع المستخدمين مع فلترة |
| GET | `/api/admin/wallet/topups` | `AdminWalletController@pendingTopups` | auth:sanctum + admin | طلبات الشحن المعلّقة |
| GET | `/api/admin/wallet/topups/{id}` | `AdminWalletController@topupDetail` | auth:sanctum + admin | تفاصيل طلب شحن |
| POST | `/api/admin/wallet/topups/{id}/approve` | `AdminWalletController@approve` | auth:sanctum + admin | قبول طلب شحن |
| POST | `/api/admin/wallet/topups/{id}/adjust` | `AdminWalletController@adjustAndApprove` | auth:sanctum + admin | تعديل المبلغ وقبول |
| POST | `/api/admin/wallet/topups/{id}/decline` | `AdminWalletController@decline` | auth:sanctum + admin | رفض طلب شحن |
| GET | `/api/admin/wallet/stats` | `AdminWalletController@stats` | auth:sanctum + admin | إحصائيات المحفظة |
| GET | `/api/admin/security/violations` | `AdminSecurityController@violations` | auth:sanctum + admin | سجل الانتهاكات |
| GET | `/api/admin/security/students` | `AdminSecurityController@studentsWithViolations` | auth:sanctum + admin | طلاب لديهم انتهاكات |
| POST | `/api/admin/security/block/{user}` | `AdminSecurityController@blockStudent` | auth:sanctum + admin | حظر طالب |
| GET | `/api/admin/courses` | `Admin\CourseController@index` | auth:sanctum + admin | قائمة الكورسات |
| POST | `/api/admin/courses` | `Admin\CourseController@store` | auth:sanctum + admin | إنشاء كورس |
| GET | `/api/admin/courses/{course}` | `Admin\CourseController@show` | auth:sanctum + admin | تفاصيل كورس |
| PUT | `/api/admin/courses/{course}` | `Admin\CourseController@update` | auth:sanctum + admin | تحديث كورس |
| DELETE | `/api/admin/courses/{course}` | `Admin\CourseController@destroy` | auth:sanctum + admin | حذف كورس |
| GET | `/api/admin/courses/{course}/lectures` | `Admin\LectureController@index` | auth:sanctum + admin | محاضرات كورس |
| POST | `/api/admin/courses/{course}/lectures` | `Admin\LectureController@store` | auth:sanctum + admin | إنشاء محاضرة |
| GET | `/api/admin/lectures/{lecture}` | `Admin\LectureController@show` | auth:sanctum + admin | تفاصيل محاضرة |
| PUT | `/api/admin/lectures/{lecture}` | `Admin\LectureController@update` | auth:sanctum + admin | تحديث محاضرة |
| DELETE | `/api/admin/lectures/{lecture}` | `Admin\LectureController@destroy` | auth:sanctum + admin | حذف محاضرة |
| POST | `/api/admin/courses/{course}/lectures/reorder` | `Admin\LectureController@reorder` | auth:sanctum + admin | إعادة ترتيب المحاضرات |
| POST | `/api/admin/lectures/{lecture}/video/upload` | `Admin\LectureVideoController@upload` | auth:sanctum + admin | رفع فيديو خام |
| GET | `/api/admin/lectures/{lecture}/video/status` | `Admin\LectureVideoController@status` | auth:sanctum + admin | حالة ترميز الفيديو |
| DELETE | `/api/admin/lectures/{lecture}/video` | `Admin\LectureVideoController@delete` | auth:sanctum + admin | حذف فيديو |
| GET | `/api/admin/lectures/{lecture}/exams` | `Admin\ExamController@index` | auth:sanctum + admin | امتحانات المحاضرة |
| POST | `/api/admin/lectures/{lecture}/exams` | `Admin\ExamController@store` | auth:sanctum + admin | إنشاء امتحان (شكل 1/2/3) |
| GET | `/api/admin/exams/{exam}` | `Admin\ExamController@show` | auth:sanctum + admin | تفاصيل امتحان |
| PUT | `/api/admin/exams/{exam}` | `Admin\ExamController@update` | auth:sanctum + admin | تحديث امتحان |
| DELETE | `/api/admin/exams/{exam}` | `Admin\ExamController@destroy` | auth:sanctum + admin | حذف امتحان |
| POST | `/api/admin/exams/{exam}/questions` | `Admin\ExamController@addQuestion` | auth:sanctum + admin | إضافة سؤال |
| PUT | `/api/admin/questions/{question}` | `Admin\ExamController@updateQuestion` | auth:sanctum + admin | تحديث سؤال |
| DELETE | `/api/admin/questions/{question}` | `Admin\ExamController@deleteQuestion` | auth:sanctum + admin | حذف سؤال |
| POST | `/api/admin/exams/{exam}/questions/reorder` | `Admin\ExamController@reorderQuestions` | auth:sanctum + admin | إعادة ترتيب الأسئلة |
| POST | `/api/admin/center-codes/generate` | `Admin\CenterCodeController@generate` | auth:sanctum + admin | توليد أكواد مركزية |
| GET | `/api/admin/center-codes` | `Admin\CenterCodeController@index` | auth:sanctum + admin | قائمة الأكواد |
| GET | `/api/admin/center-codes/export` | `Admin\CenterCodeController@export` | auth:sanctum + admin | تصدير الأكواد |
| GET | `/api/admin/test-auth` | Closure | auth:sanctum + admin | اختبار صلاحيات الأدمن |

### 4.10 مسارات مكرّرة

يوجد تكرار في تعريف مسارات الفيديو في `api.php` — مجموعة `/api/video` مكرّرة مرتين (السطور 160-165 و 167-172)، مما يعني أن نفس المسارات مسجلة مرتين. كما يوجد تكرار في وحدات التحكم: `Student\CenterCodeController` و `Student\CodeRedemptionController` يؤديان نفس الوظيفة.

---

## 5. الأدوار والصلاحيات

### 5.1 الطالب (Student)

| الإجراء | مسموح |
|---------|-------|
| تسجيل حساب جديد | نعم |
| التحقق من OTP | نعم |
| تسجيل الدخول | نعم (ف إذا كان active) |
| رؤية الكورسات المتاحة | نعم |
| شراء كورس بالنقاط | نعم (ف إذا كان الرصيد كافياً) |
| استبدال كود مركزي | نعم |
| مشاهدة فيديو محاضرة | نعم (ف إذا اشترى الكورس + اكتمل الترميز) |
| تقديم امتحان | نعم (ف إذا كانت المحاضرة مفتوحة تسلسلياً) |
| شحن المحفظة (InstaPay/VF Cash) | نعم |
| رفع إثبات دفع | نعم |
| إعادة إرسال مستندات | نعم (ف إذا كان مرفوضاً) |
| الوصول لأي endpoint أدمن | لا |

### 5.2 الأدمن (Admin)

| الإجراء | مسموح |
|---------|-------|
| جميع صلاحيات الطالب | نعم |
| قبول/رفض الطلاب | نعم |
| CRUD الكورسات | نعم |
| CRUD المحاضرات + ترتيب | نعم |
| رفع/حذف فيديوهات | نعم |
| CRUD الامتحانات والأسئلة | نعم |
| توليد أكواد مركزية | نعم |
| مراجعة طلبات الشحن (قبول/تعديل/رفض) | نعم |
| عرض الانتهاكات وحظر الطلاب | نعم |
| عرض إحصائيات المحفظة | نعم |

### 5.3 آلية التحقق من الأدمن

- العمود `role` في جدول `users`: enum (`student`, `admin`)
- العمود `is_admin` في جدول `users`: boolean
- الـ Accessor `getIsAdminAttribute()`: يتحقق من `role === 'admin'`
- الـ Middleware `admin` (مسجّل في `api.php`): يستخدم `AdminMiddleware` الذي يتحقق من `$user->is_admin`
- **مشكلة:** يوجد عمودان يمثلان نفس المفهوم (`role` و `is_admin`). الـ Seeder يستخدم `is_admin` مباشرة لكن الموديل يعتمد على `role`.

---

## 6. الكيانات الأساسية وعلاقاتها

### 6.1 مخطط الكيانات

```
User (المستخدم)
├── hasMany WalletTransaction (معاملات المحفظة)
├── hasMany WalletTopupRequest (طلبات الشحن)
├── belongsToMany Course (الكورسات المشتراة - عبر course_student)
├── hasMany VideoViolation (انتهاكات الفيديو)
├── hasMany VideoEncoding (عمليات الترميز)
└── hasMany ExamAttempt (محاولات الامتحان)

Course (الكورس)
├── hasMany Lecture (المحاضرات) - مرتبة بـ order_index
├── belongsToMany User (الطلاب المشتركون - عبر course_student)
└── hasMany CenterCode (أكواد المراكز)

Lecture (المحاضرة)
├── belongsTo Course (الكورس)
├── hasMany Exam (الامتحانات) - مرتبة بـ form_index
├── hasMany ExamAttempt (محاولات الامتحان)
├── hasMany VideoEncoding (عمليات الترميز)
└── hasMany VideoViolation (الانتهاكات)

Exam (الامتحان)
├── belongsTo Lecture (المحاضرة)
└── hasMany Question (الأسئلة) - مرتبة بـ order_index

Question (السؤال)
└── belongsTo Exam (الامتحان)

ExamAttempt (محاولة الامتحان)
├── belongsTo User (المستخدم)
├── belongsTo Exam (الامتحان)
└── belongsTo Lecture (المحاضرة)

CenterCode (كود المركز)
├── belongsTo Course (الكورس)
└── belongsTo User (المستخدم المستخدم - used_by)

WalletTransaction (معاملة المحفظة)
├── belongsTo User (المستخدم)
├── belongsTo PaymentNumber (رقم الدفع)
└── belongsTo WalletTopupRequest (طلب الشحن)

WalletTopupRequest (طلب شحن المحفظة)
├── belongsTo User (المستخدم)
├── belongsTo PaymentNumber (رقم الدفع)
└── belongsTo User (المراجع - reviewed_by)

PaymentNumber (رقم الدفع)
└── hasMany WalletTopupRequest (طلبات الشحن)

Otp (رمز التحقق)
└── (كيان مستقل - يخزّن الهاتف + الرمز + وقت الانتهاء)

VideoEncoding (عملية ترميز فيديو)
└── belongsTo Lecture (المحاضرة)

StudentVideoEncoding (ترميز فيديو لكل طالب)
├── belongsTo User (الطالب)
├── belongsTo Lecture (المحاضرة)
└── belongsTo Course (الكورس)

VideoViolation (انتهاك فيديو)
├── belongsTo User (المستخدم)
└── belongsTo Lecture (المحاضرة)
```

### 6.2 تفاصيل الحقول الرئيسية

#### User
`id`, `full_name`, `academic_year`, `student_number`, `phone`, `parent_phone`, `school`, `parent_job`, `governorate`, `email`, `password`, `id_image`, `status` (pending/active/rejected), `wallet_balance`, `rejection_reason`, `role` (student/admin), `is_admin` (boolean)

#### Course
`id`, `title`, `description`, `price_points`, `validity_date`

#### Lecture
`id`, `course_id`, `title`, `description`, `order_index`, `b2_video_path`, `cdn_url`, `is_encoded`, `encoding_status`, `is_locked`, `vdocipher_video_id` (قديم - من المايكريشن الأول), `video_duration` (مضاف لاحقاً)

#### Exam
`id`, `lecture_id`, `form_index` (1/2/3), `duration_minutes`, `pass_score`, `title`, `instructions`, `shuffle_questions`, `shuffle_options`, `max_attempts`, `show_correct_answers`, `show_score`, `per_question_time`, `random_question_count`

#### Question
`id`, `exam_id`, `body`, `options` (JSON), `correct_answer`, `order_index`, `question_type` (mcq/multi_select/essay/ranking/matching/fill_blank), `image_url`, `option_images`, `correct_answers`, `sample_answer`, `correct_order`, `matching_pairs`, `correct_text`, `points`, `time_limit_seconds`

#### course_student (Pivot)
`student_id`, `course_id`, `access_type` (purchase/center_code), `reference`, `granted_at`

---

## 7. تدفقات المستخدم الحرجة

### 7.1 التسجيل

1. الطالب يملأ نموذج التسجيل (`/register`) — البيانات الشخصية + صورة الهوية
2. يتم رفع صورة الهوية إلى Cloudinary عبر `FileUploadService`
3. تُخزّن بيانات التسجيل مؤقتاً في Cache (10 دقائق) مع مفتاح `register_temp:{phone}`
4. يُرسل OTP إلى `parent_phone` عبر Twilio (`OtpService::send()`)
5. في وضع التطوير: يُعاد رمز OTP في الاستجابة (`dev_otp`)
6. الطالب يدخل OTP في صفحة `/otp`
7. عند التحقق الناجح: يُنشأ حساب بحالة `pending` + يُصدر رمز Sanctum
8. يُعاد توجيه الطالب إلى `/waiting-room`

### 7.2 تسجيل الدخول

1. الطالب يُدخل البريد الإلكتروني + كلمة المرور (`/login`)
2. يتحقق `AuthController@login` من صحة البيانات
3. إذا كان `pending` → خطأ `ERR_ACCOUNT_PENDING` (403)
4. إذا كان `rejected` → خطأ `ERR_ACCOUNT_REJECTED` (403)
5. إذا كان `active` → يُحذف جميع الرموز السابقة + يُصدر رمز جديد
6. يُخزّن الرمز في localStorage و cookie من جهة الـ frontend

### 7.3 غرفة الانتظار

1. صفحة `/waiting-room` تفحص حالة الحساب عبر `GET /api/auth/status` عند التحميل
2. تستمع لحدث `visibilitychange` لإعادة الفحص عند العودة للتبويب
3. إذا أصبح `active` → إعادة توجيه إلى الصفحة الرئيسية
4. إذا `rejected` → عرض سبب الرفض + زر إعادة الإرسال

### 7.4 الاشتراك بكورس

1. الطالب يفتح صفحة الكورس (`/courses/{id}`)
2. يضغط "شراء بالنقاط"
3. `POST /api/courses/{course}/purchase`
4. التحقق من: لم يشتره من قبل + الرصيد كافٍ
5. في معاملة قاعدة بيانات:
   - `WalletService::deduct()` → خصم النقاط
   - ربط الطالب بالكورس في `course_student`
   - إنشاء سجلات `StudentVideoEncoding` لكل محاضرة لها فيديو خام
   - إرسال مهمة `EncodeStudentVideo` إلى الطابور
6. الفيديوهات تُرمّز في الخلفية مع علامة مائية برقم هاتف ولي الأمر

### 7.5 الدفع بـ InstaPay/Vodafone Cash

1. الطالب يفتح صفحة المحفظة (`/wallet`) ويختار المزوّد
2. `GET /api/wallet/topup/initiate?provider=instapay` → يحصل على رقم دفع (من `PaymentNumberService` بالتناوب)
3. الطالب يحوّل المبلغ ويرفع لقطة شاشة كإثبات
4. `POST /api/wallet/topup/submit` → رفع الإثبات إلى Cloudinary + إنشاء `WalletTopupRequest` بحالة `pending`
5. الأدمن يراجع الطلب في `/admin/topups`:
   - قبول → `WalletService::completeTopupFromRequest()` → إضافة الرصيد
   - تعديل المبلغ + قبول → شحن بالمبلغ المعدّل
   - رفض → تحديث الحالة إلى `declined`
6. إشعار Webhook من Fawry/Vodafone Cash (إن وُجد) → تحديث تلقائي

### 7.6 مشاهدة درس (VdoCipher/Backblaze B2)

1. الطالب يفتح محاضرة (`/lectures/{id}`)
2. `GET /api/lectures/{lecture}/playback`
3. التحقق من: الطالب يمتلك الكورس + الترميز مكتمل
4. فحص أمني: مسار الفيديو لا يبدأ بـ `raw/` (لن يُعرض فيديو خام أبداً)
5. توليد رابط موقّع من Backblaze B2 (صلاحية 4 ساعات)
6. مشغّل الفيديو:
   - علامة مائية متحركة (رقم هاتف ولي الأمر) تتحرك كل ثانية
   - كشف لقطة الشاشة → شاشة سوداء + تحذير + تسجيل انتهاك
   - كشف تسجيل الشاشة → شاشة سوداء + تحذير
   - بعد 10 انتهاكات → حظر الطالب

### 7.7 تقديم امتحان (3 أشكال احتياطية)

1. `GET /api/lectures/{lecture}/exam`
2. التحقق من: يمتلك الكورس + المحاضرة مفتوحة تسلسلياً
3. البحث عن الشكل المتاح: إذا رسب في الشكل 1 → يُسمح بالشكل 2، إلخ
4. إنشاء `ExamAttempt` جديدة + إرجاع الأسئلة (بترتيب عشوائي)
5. الطالب يُجيب ويُقدّم → `POST /api/lectures/{lecture}/exam/{exam}/submit`
6. حساب النتيجة: `(الإجابات الصحيحة / إجمالي الأسئلة) * 100`
7. إذا نجح (`score >= pass_score`) → فتح المحاضرة التالية تسلسلياً
8. إذا رسب في جميع الأشكال الثلاثة → `ERR_EXAM_LOCKOUT` (حظر)

---

## 8. ملاحظات المصمم/المطوّر

### 8.1 مشاكل أمنية

| # | المشكلة | الخطورة | التفاصيل |
|---|---------|---------|----------|
| 1 | **ازدواجية حقل الأدمن** | عالية | يوجد `role` (enum) و `is_admin` (boolean) في جدول `users`. الـ Seeder يستخدم `is_admin = true` لكن الموديل يعتمد على `role === 'admin'`. هذا قد يسمح بتجاوز صلاحيات الأدمن. |
| 2 | **عدم التحقق من idempotency في Webhooks** | عالية | Webhook Vodafone Cash لا يتحقق من التوقيع (عكس Fawry الذي يتحقق). كما أن آلية Idempotency تعتمد فقط على حالة المعاملة وليس على مرجع فريد. |
| 3 | **عدم وجود Rate Limiting** | متوسطة | لا يوجد تحديد لمعدل الطلبات على نقاط حساسة (تسجيل الدخول، إرسال OTP، الدفع). |
| 4 | **تخزين الرمز في localStorage** | متوسطة | الرمز (token) يُخزّن في localStorage و cookie. localStorage عرضة لهجمات XSS. |
| 5 | **نوع الخطأ في ExamController** | منخفضة | دالة `isLectureUnlocked` تستخدم نوع `User` لكنها لا تستورد الموديل `User` (يوجد `use App\Models\User` مفقود في أعلى الملف). |

### 8.2 مشاكل هيكلية

| # | المشكلة | التفاصيل |
|---|---------|----------|
| 1 | **مسارات API مكرّرة** | مجموعة `/api/video` مكرّرة مرتين في `api.php` (السطور 160-172). |
| 2 | **وحدات تحكم مكرّرة** | `Student\CenterCodeController` و `Student\CodeRedemptionController` يؤديان نفس الوظيفة مع أنماط استجابة مختلفة. |
| 3 | **وحدات تحكم غير مستخدمة** | `Student\StudentCourseController` و `VideoController` لهما ملفات لكن لا يُشار إليهما في المسارات الحالية (أو يشيران لمسارات مكرّرة). |
| 4 | **مايكريشنات مكرّرة** | يوجد ملفات مايكريشن مكرّرة لـ `exams` و `questions` و `exam_attempts` (بتواريخ 2026_04_24 و 2026_04_25). هذا سيسبب أخطاء عند تشغيل `php artisan migrate` على قاعدة بيانات نظيفة. |
| 5 | **غياب ملفات الإعداد** | لا يوجد `next.config.js/ts` في الـ frontend. لا يوجد `ffmpeg` مهيأ كخدمة في Laravel — الاعتماد على تثبيت النظام المحلي. |
| 6 | **حقل `vdocipher_video_id` قديم** | المايكريشن الأول لـ `lectures` يحتوي على `vdocipher_video_id` لكن المشروع انتقل إلى Backblaze B2. الحقل لا يُستخدم لكنه لا يزال موجوداً. |
| 7 | **Seeder قديم** | `DatabaseSeeder` يستخدم حقول `name` و `id_number` غير موجودة في المايكريشن الحالي. |
| 8 | **عدم استخدام Form Requests** | `AuthController@register` يتحقق مباشرة في المتحكم بدلاً من استخدام `RegisterRequest` الموجود. |

### 8.3 مشاكل وظيفية

| # | المشكلة | التفاصيل |
|---|---------|----------|
| 1 | **نظام الفتح التسلسلي غير مكتمل** | `VideoPlaybackController` يحتوي على تعليق `TODO: Check if lecture is unlocked (sequential progression)`. الفتح التسلسلي مُطبّق فقط في `Student\ExamController` وليس في تشغيل الفيديو. |
| 2 | **نظام الحظر غير مكتمل** | `VideoViolationController` يحتوي على `TODO: Implement blocking logic`. بعد 10 انتهاكات يُسجّل فقط ولا يُحظر فعلياً. |
| 3 | **التوصيل الفوري غير مكتمل** | `AdminSecurityController` يستدعي `course` على `VideoViolation` لكن الموديل لا يعرّف علاقة `course`. |
| 4 | **غياب نظام الإشعارات** | Milestone 8 (الإشعارات + المنتدى) لم يُبدأ بعد. |
| 5 | **غياب جلسة نشطة واحدة** | Milestone 10 (Single active session) لم يُطبّق بعد. حالياً يُحذف الرموز القديمة عند تسجيل الدخول لكن يمكن استخدام رمز قديم من جلسة أخرى ما دام صالحاً. |
| 6 | **صلاحية الاشتراك** | `validity_date` في جدول `courses` لا يُتحقق منها عند الوصول. Milestone 10 يتضمن أمر مجدول لإبطال الوصول المنتهي لكنه لم يُطبّق. |
| 7 | **Admin Instant Unlock** | المهام 7.11-7.12 (فتح يدوي للمحاضرة التالية) لم تُطبّق بعد. |
| 8 | **Admin Reset Attempts** | المهمة 7.13 (إعادة تعيين محاولات الامتحان) لم تُطبّق بعد. |

### 8.4 ملاحظات إيجابية

- نظام المحفظة (`WalletService`) مُنفّذ بشكل متين مع معاملات قاعدة بيانات
- علامة مائية جنائية متحركة في الفيديو (رقم هاتف ولي الأمر)
- فصل أمني بين الفيديو الخام (`raw/`) والمرمّز (`videos/student_{id}/`)
- رابط تشغيل موقّع بصلاحية 4 ساعات
- الترميز يحدث لكل طالب على حدة عند شراء الكورس
- نظام أكواد المراكز يعمل بشكل كامل (توليد + استبدال + تصدير)

---

## 9. بيانات البذرة الجاهزة

### 9.1 الـ Seeders المتوفرة

| Seeder | الملف | الحالة |
|--------|-------|--------|
| DatabaseSeeder | `database/seeders/DatabaseSeeder.php` | قديم — يستخدم حقول غير موجودة (`name`, `id_number`) |
| TestUserSeeder | `database/seeders/TestUserSeeder.php` | يعمل جزئياً — يستخدم `is_admin` مباشرة بدلاً من `role` |

### 9.2 الحسابات التجريبية (من TestUserSeeder)

| الدور | البريد | كلمة المرور | الرصيد | الحالة |
|------|--------|-------------|--------|--------|
| أدمن | admin@eduplatform.test | admin123 | 1000 | active |
| طالب نشط | student@eduplatform.test | student123 | 500 | active |
| طالب معلّق | pending@eduplatform.test | pending123 | 0 | pending |
| طالب مرفوض | rejected@eduplatform.test | rejected123 | 0 | rejected |

### 9.3 بيانات البذرة المفقودة

لا توجد بيانات بذرة لـ:
- كورسات تجريبية
- محاضرات تجريبية
- أرقام دفع تجريبية
- امتحانات وأسئلة تجريبية
- أكواد مراكز تجريبية

يجب إنشاء هذه البيانات يدوياً عبر الـ API أو إعداد Seeder إضافي.

---

## ملخص حالة المmilestones

| Milestone | الحالة | ملاحظة |
|-----------|--------|--------|
| 1. البنية التحتية | ~90% | النشر على Vercel لم يتم (1.8, 1.9) |
| 2. المصادقة والـ OTP | 100% | مكتمل بالكامل |
| 3. إدارة الكورسات والمحاضرات | 100% | مكتمل بالكامل |
| 4. المحفظة والمدفوعات | 100% | مكتمل بالكامل |
| 5. شراء الكورسات وأكواد المراكز | 100% | مكتمل بالكامل |
| 6. مشغّل الفيديو والحماية | ~95% | حظر 10 ضربات غير مكتمل |
| 7. الامتحانات والفتح التسلسلي | ~60% | API جزئي + UI غير مكتمل |
| 8. لوحة الطالب والإشعارات | 0% | لم يُبدأ |
| 9. مراقبة الأدمن والمالية | 0% | لم يُبدأ |
| 10. تعزيز الأمن والإطلاق | 0% | لم يُبدأ |
