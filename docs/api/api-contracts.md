# عقود API التفصيلية — منصة إحياء (Ihyaa)
## API Contracts — SRS-API-01..49

**المرجع:** SRS-MVP v3 §5.4.5 · rate-limiting-spec.md · design-decisions.md
**الإصدار:** 1.0.0 (MVP) — بالتوافق التام مع `openapi.yaml`

---

## 0. الاتفاقيات العامة (Conventions)

| البند | القيمة |
|-------|--------|
| Base URL (إنتاج) | `https://api.ihyaa.app` |
| Base URL (تطوير) | `http://localhost:8000` |
| تنسيق البيانات | `JSON` — `Content-Type: application/json` (عدا الملفات: `multipart/form-data`) |
| الترميز | `UTF-8` — كل النصوص تقبل العربية |
| الرؤوس القياسية للطلب | `Accept: application/json` · `Accept-Language: ar|en` (اختياري) |
| المصادقة | `Authorization: Bearer {sanctum_token}` — صلاحية 24 ساعة |
| رؤوس كل استجابة | `X-RateLimit-Limit` · `X-RateLimit-Remaining` · `X-RateLimit-Reset` |
| رؤوس 429 | ما سبق + `Retry-After` |
| ترقيم الصفحات | `?page=N` مع `per_page` (افتراضي 12، أقصى 50) — استجابة `{data, meta, links}` |
| معرّف اللغة في الرسائل | `message` بالعربية افتراضياً، بالإنجليزية عند `Accept-Language: en` |

### هيكل الخطأ الموحد (Error Envelope)

```json
{
  "code": "VALIDATION_ERROR",
  "message": "البيانات المدخلة غير صحيحة",
  "errors": {
    "description": ["يجب أن يتراوح طول الوصف بين 50 و2000 حرف"]
  }
}
```

| الحقل | النوع | الوصف |
|-------|------|-------|
| `code` | string | رمز خطأ آلي (لا يتغير مع اللغة) |
| `message` | string | رسالة موجهة للمستخدم (مترجمة) |
| `errors` | object/null | تفاصيل أخطاء التحقق لكل حقل (فقط في 422) |

### هيكل 429 الموحد (Rate Limit)

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "عدد الطلبات تجاوز الحد المسموح. يرجى المحاولة بعد 30 ثانية.",
  "retry_after": 30,
  "reset_at": 1783040000
}
```

### جدول رموز الأخطاء (Error Codes Catalog)

| الكود | HTTP | المعنى |
|-------|------|--------|
| `VALIDATION_ERROR` | 422 | فشل التحقق من صحة البيانات |
| `INVALID_CREDENTIALS` | 401 | بريد أو كلمة مرور غير صحيحة |
| `UNAUTHENTICATED` | 401 | توكن مفقود أو منتهي |
| `EMAIL_NOT_VERIFIED` | 403 | البريد غير مفعّل — يجب إدخال OTP أولاً |
| `EMAIL_ALREADY_VERIFIED` | 409 | البريد مفعّل مسبقاً |
| `OTP_INVALID` | 422 | رمز OTP غير صحيح |
| `OTP_EXPIRED` | 422 | انتهت صلاحية الرمز (دقيقة واحدة) — اطلب رمزاً جديداً |
| `ROLE_REQUIRED` | 422 | يجب اختيار الدور عند أول دخول OAuth |
| `ROLE_ALREADY_SET` | 409 | الدور محدد مسبقاً ولا يمكن تغييره |
| `FORBIDDEN` | 403 | لا صلاحية لهذا الإجراء (دور/ملكية/إفصاح) |
| `NOT_FOUND` | 404 | المورد غير موجود |
| `PROJECT_NOT_AVAILABLE` | 404 | المشروع محذوف أو غير متاح (UC-06 E2) |
| `INTEREST_ALREADY_EXISTS` | 409 | سبق إرسال طلب لهذا المشروع (SRS-F08-03) |
| `PROFILE_INCOMPLETE` | 422 | أكمل ملفك الشخصي أولاً (UC-06 A1) |
| `INTEREST_CANCELLED` | 409 | الطلب ملغي من قبل المستثمر (UC-06 E3) |
| `INTEREST_NOT_PENDING` | 409 | الطلب ليس في حالة معلق (قبول/رفض غير ممكن) |
| `AGREEMENT_NOT_READY` | 409 | المستند لم يُنشأ بعد — سيُتاح قريباً (UC-07 E1) |
| `EVALUATION_RATE_LIMITED` | 409 | لا يمكن إعادة التقييم قبل 24 ساعة (SRS-AI-C01) |
| `EVALUATION_NOT_FAILED` | 409 | لا يمكن إعادة المحاولة لتقييم غير فاشل |
| `EVALUATION_IN_PROGRESS` | 409 | يوجد تقييم قيد المعالجة لهذا المشروع |
| `EVALUATION_REQUIRED` | 422 | يجب وجود تقييم مكتمل واحد على الأقل لطلب التحليل (UC-13) |
| `ANALYSIS_IN_PROGRESS` | 409 | لا يزال التحليل قيد المعالجة (UC-13 E2) |
| `VIDEO_URL_INVALID` | 422 | الرابط لا ينتمي إلى YouTube أو Vimeo (UC-02) |
| `FILE_TYPE_NOT_ALLOWED` | 422 | صيغة الملف غير مسموحة (MIME) |
| `FILE_TOO_LARGE` | 422 | حجم الملف تجاوز الحد |
| `RESET_LINK_INVALID` | 422 | رابط إعادة التعيين غير صالح أو منتهي |
| `ALREADY_SAVED` | 200 | المشروع محفوظ مسبقاً (إعلام وليس خطأ) |
| `RATE_LIMIT_EXCEEDED` | 429 | تجاوز معدل الطلبات |
| `INTERNAL_ERROR` | 500 | خطأ خادم (بدون تفاصيل داخلية) |

---

# 1. المصادقة (Auth) — SRS-API-01..08

## 1.1 POST `/api/register` — تسجيل مستخدم جديد (SRS-API-01)

**الصلاحية:** عام · **Rate Limit:** `auth.register` — 3/دقيقة لكل IP · **المصادقة:** لا

**الرؤوس:** `Accept: application/json` · `Content-Type: application/json`

**Request Body (JSON):**

```json
{
  "name": "أحمد السالم",
  "email": "ahmed@example.com",
  "password": "Str0ng!Pass",
  "password_confirmation": "Str0ng!Pass",
  "role": "idea_owner"
}
```

| الحقل | النوع | إلزامي | القيود |
|-------|------|--------|--------|
| `name` | string | نعم | 2–120 حرفاً |
| `email` | string | نعم | بريد صحيح وفريد |
| `password` | string | نعم | ≥ 8 أحرف، حرف كبير + رقم |
| `password_confirmation` | string | نعم | مطابقة كلمة المرور |
| `role` | string | نعم | `idea_owner` أو `investor` فقط (لا `admin`) |

**Response 201 Created:**

```json
{
  "message": "تم إنشاء الحساب. يرجى تفعيل بريدك الإلكتروني عبر الرمز المرسل (صالح لدقيقة واحدة).",
  "user": {
    "id": 12,
    "name": "أحمد السالم",
    "email": "ahmed@example.com",
    "role": "idea_owner",
    "email_verified_at": null,
    "created_at": "2026-08-02T09:15:00+03:00"
  }
}
```

> لا يُصدر توكن في هذه الاستجابة — لا دخول قبل التفعيل (SRS-F01-02). التوكن يُصدر عند `email/verify` أو `login` لاحقاً.

**Status Codes:**

| الكود | الحالة | مثال الاستجابة |
|-------|--------|----------------|
| 201 | تم الإنشاء + إرسال OTP | أعلاه |
| 422 | تحقق فاشل | `VALIDATION_ERROR` — `errors.email: ["هذا البريد مسجّل مسبقاً. هل ترغب في تسجيل الدخول؟"]` |
| 429 | تجاوز الحد | `RATE_LIMIT_EXCEEDED` |

**الأخطاء:** `VALIDATION_ERROR` (بريد مكرر، كلمة مرور ضعيفة، دور غير صالح) · `RATE_LIMIT_EXCEEDED`.

---

## 1.2 POST `/api/login` — تسجيل الدخول (SRS-API-02)

**الصلاحية:** عام · **Rate Limit:** `auth.login` — 5/دقيقة لكل email · **المصادقة:** لا

**Request Body:**

```json
{
  "email": "ahmed@example.com",
  "password": "Str0ng!Pass"
}
```

**Response 200 OK:**

```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "token": "2|kX9fT2mQ8vLp4nR7wY0sB3dH6jU5eA1c",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": 12,
    "name": "أحمد السالم",
    "email": "ahmed@example.com",
    "role": "idea_owner",
    "email_verified_at": "2026-08-02T09:16:00+03:00"
  }
}
```

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 200 | نجاح — توكن صالح 24 ساعة |
| 401 | `INVALID_CREDENTIALS` — "البريد الإلكتروني أو كلمة المرور غير صحيحة" |
| 403 | `EMAIL_NOT_VERIFIED` — "يرجى تفعيل بريدك الإلكتروني أولاً" |
| 422 | `VALIDATION_ERROR` — حقول ناقصة |
| 429 | `RATE_LIMIT_EXCEEDED` |

**الأخطاء:** `INVALID_CREDENTIALS` · `EMAIL_NOT_VERIFIED` · `VALIDATION_ERROR` · `RATE_LIMIT_EXCEEDED`.

---

## 1.3 POST `/api/logout` — تسجيل الخروج (SRS-API-03)

**الصلاحية:** مصادق · **Rate Limit:** `auth.logout` — 10/دقيقة لكل user_id

**الرؤوس:** `Authorization: Bearer {token}`

**Response 200 OK:**

```json
{
  "message": "تم تسجيل الخروج وإنهاء الجلسة بنجاح"
}
```

> يُلغى التوكن الحالي فوراً (SRS-NFR-07). لا Request Body.

**Status Codes:** 200 · 401 (`UNAUTHENTICATED`) · 429.

---

## 1.4 POST `/api/email/verify` — تفعيل البريد بالرمز OTP (SRS-API-04)

**الصلاحية:** غير مصادق (مستخدم جديد) · **Rate Limit:** `auth.email-verify` — 3/دقيقة لكل email

**Request Body (تحقق):**

```json
{
  "email": "ahmed@example.com",
  "code": "483920"
}
```

**Request Body (إعادة إرسال — حذف `code`):**

```json
{
  "email": "ahmed@example.com"
}
```

**Response 200 OK (تحقق ناجح):**

```json
{
  "message": "تم تفعيل البريد الإلكتروني بنجاح",
  "token": "3|aB1cDe2FgHi3JkLm4NoP5qRs6TuVw7xY",
  "token_type": "Bearer",
  "user": {
    "id": 12,
    "name": "أحمد السالم",
    "role": "idea_owner",
    "email_verified_at": "2026-08-02T09:17:30+03:00"
  }
}
```

**Response 200 OK (إعادة إرسال):**

```json
{
  "message": "تم إرسال رمز جديد (صالح لدقيقة واحدة)"
}
```

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 200 | تحقق ناجح (توكن) أو إعادة إرسال |
| 422 | `OTP_INVALID` — "الرمز غير صحيح" / `OTP_EXPIRED` — "انتهت صلاحية الرمز. اطلب رمزاً جديداً" / `VALIDATION_ERROR` |
| 409 | `EMAIL_ALREADY_VERIFIED` — "البريد مفعّل مسبقاً" |
| 429 | `RATE_LIMIT_EXCEEDED` |

**الأخطاء:** `OTP_INVALID` · `OTP_EXPIRED` · `EMAIL_ALREADY_VERIFIED` · `RATE_LIMIT_EXCEEDED`.

> **OTP:** صلاحية دقيقة واحدة (design-decisions §4) · `code` 6 أرقام.

---

## 1.5 POST `/api/forgot-password` — طلب إعادة التعيين (SRS-API-05)

**الصلاحية:** عام · **Rate Limit:** `auth.forgot-password` — 2/دقيقة لكل email

**Request Body:**

```json
{
  "email": "ahmed@example.com"
}
```

**Response 200 OK (دائماً — منع تسريب وجود البريد):**

```json
{
  "message": "إذا كان البريد مسجلاً في المنصة، ستصل رسالة إعادة التعيين خلال دقائق (الرابط صالح لمدة ساعة)"
}
```

**Status Codes:** 200 · 422 · 429.

---

## 1.6 POST `/api/reset-password` — إعادة تعيين كلمة المرور (SRS-API-06)

**الصلاحية:** عام · **Rate Limit:** `auth.reset-password` — 2/دقيقة لكل email

**Request Body:**

```json
{
  "email": "ahmed@example.com",
  "token": "8e2f9c1a4b7d",
  "password": "New!Pass123",
  "password_confirmation": "New!Pass123"
}
```

**Response 200 OK:**

```json
{
  "message": "تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن"
}
```

**Status Codes:** 200 · 422 (`RESET_LINK_INVALID` — "الرابط غير صالح أو منتهي الصلاحية" / `VALIDATION_ERROR`) · 429.

---

## 1.7 GET `/api/auth/{provider}` — بدء تسجيل الدخول عبر OAuth (SRS-API-07)

**الصلاحية:** عام · **Rate Limit:** `auth.oauth` — 5/دقيقة لكل IP · **`provider`:** `google` | `github` | `linkedin`

**Response 200 OK:**

```json
{
  "redirect_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&state=..."
}
```

**Status Codes:** 200 · 422 (`VALIDATION_ERROR` — مزود غير مدعوم) · 429.

---

## 1.8 POST `/api/auth/{provider}/callback` — استلام رد OAuth (SRS-API-08)

**الصلاحية:** عام · **Rate Limit:** `auth.oauth` — 5/دقيقة لكل IP

**Request Body:**

```json
{
  "code": "4/0AX4XfGi...",
  "role": "idea_owner"
}
```

| الحقل | النوع | إلزامي | القيود |
|-------|------|--------|--------|
| `code` | string | نعم | كود التفويض من المزود |
| `role` | string | شرطي | **إلزامي في أول دخول** (`idea_owner`/`investor`)؛ يُتجاهل إذا كان الدور محدداً |

**Response 200 OK (مستخدم قائم — دخول):**

```json
{
  "message": "تم تسجيل الدخول عبر Google",
  "token": "4|Lm2Pq5Rt8Uv1Wx4Yz7Ab3Cd6Ef9Gh0Jk",
  "requires_role": false,
  "user": {
    "id": 5,
    "name": "سارة الحربي",
    "email": "sara@gmail.com",
    "role": "investor",
    "provider": "google",
    "provider_id": "1042871958209283741",
    "email_verified_at": "2026-07-15T14:00:00+03:00"
  }
}
```

**Response 200 OK (أول دخول — اختيار الدور):**

```json
{
  "message": "تم التحقق من حسابك. يرجى اختيار دورك للمتابعة",
  "token": "4|Lm2Pq5Rt8Uv1Wx4Yz7Ab3Cd6Ef9Gh0Jk",
  "requires_role": true,
  "user": {
    "id": 88,
    "name": "خالد العتيبي",
    "email": "khaled@github.com",
    "role": null,
    "provider": "github",
    "email_verified_at": "2026-08-02T10:00:00+03:00"
  }
}
```

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 200 | دخول/أول دخول (مع `requires_role`) |
| 422 | `ROLE_REQUIRED` — "يرجى اختيار دورك (صاحب فكرة أو مستثمر)" عند أول دخول بدون `role` · `VALIDATION_ERROR` |
| 401 | فشل تفويض المزود — "تعذر الاتصال بـ Google. يرجى المحاولة مرة أخرى أو استخدام البريد وكلمة المرور" |
| 429 | `RATE_LIMIT_EXCEEDED` |

**الأخطاء:** `ROLE_REQUIRED` · `VALIDATION_ERROR` · `UNAUTHENTICATED` (فشل المزود) · `RATE_LIMIT_EXCEEDED`.

---

# 2. الملف الشخصي (Profile) — SRS-API-09..12

## 2.1 GET `/api/profile` — الملف الشخصي الحالي (SRS-API-09)

**الصلاحية:** مصادق · **Rate Limit:** `shared.read` (60/دقيقة صاحب فكرة · 120/دقيقة مستثمر)

**Response 200 OK (صاحب فكرة):**

```json
{
  "user": {
    "id": 12,
    "name": "أحمد السالم",
    "email": "ahmed@example.com",
    "role": "idea_owner",
    "avatar_url": "https://api.ihyaa.app/storage/avatars/12_1700.jpg",
    "email_verified_at": "2026-08-02T09:17:30+03:00",
    "created_at": "2026-08-02T09:15:00+03:00"
  },
  "profile": {
    "bio": "طالب هندسة برمجيات، مهتم ببناء حلول ذكية للمنشآت الصغيرة",
    "skills": ["Laravel", "React", "AI"],
    "social_links": { "linkedin": "https://linkedin.com/in/ahmed" },
    "university": "جامعة الملك سعود",
    "major": "علوم الحاسب"
  }
}
```

**Response 200 OK (مستثمر):**

```json
{
  "user": {
    "id": 5,
    "name": "سارة الحربي",
    "role": "investor",
    "email": "sara@gmail.com",
    "email_verified_at": "2026-07-15T14:00:00+03:00"
  },
  "profile": {
    "bio": "مستثمر ملاك في التقنية المالية والذكاء الاصطناعي",
    "investment_focus": "fintech",
    "investment_range": { "min": 50000, "max": 500000 },
    "preferred_sectors": ["fintech", "ai", "saas"]
  }
}
```

**Status Codes:** 200 · 401 (`UNAUTHENTICATED`) · 429.

---

## 2.2 PUT `/api/profile` — تحديث الملف الشخصي (SRS-API-10)

**الصلاحية:** مصادق · **Rate Limit:** `shared.write` — 10/دقيقة

**Request Body (صاحب فكرة):**

```json
{
  "name": "أحمد السالم المطيري",
  "bio": "طالب هندسة برمجيات ومهتم ببناء حلول ذكية",
  "skills": ["Laravel", "React", "AI", "UI/UX"],
  "social_links": { "linkedin": "https://linkedin.com/in/ahmed", "github": "https://github.com/ahmed" },
  "university": "جامعة الملك سعود",
  "major": "علوم الحاسب"
}
```

**Request Body (مستثمر):**

```json
{
  "name": "سارة الحربي",
  "bio": "مستثمر ملاك في التقنية المالية",
  "investment_focus": "fintech",
  "investment_range": { "min": 50000, "max": 500000 },
  "preferred_sectors": ["fintech", "ai", "saas"]
}
```

**Request Body (اختيار الدور عند أول دخول OAuth):**

```json
{
  "role": "investor"
}
```

> `role` يُقبل فقط عندما `role = null` (أول دخول OAuth) — وإلا `409 ROLE_ALREADY_SET`.

**Response 200 OK:**

```json
{
  "message": "تم تحديث الملف الشخصي بنجاح",
  "user": { "id": 12, "name": "أحمد السالم المطيري", "role": "idea_owner" },
  "profile": {
    "bio": "طالب هندسة برمجيات ومهتم ببناء حلول ذكية",
    "skills": ["Laravel", "React", "AI", "UI/UX"],
    "social_links": { "linkedin": "https://linkedin.com/in/ahmed", "github": "https://github.com/ahmed" },
    "university": "جامعة الملك سعود",
    "major": "علوم الحاسب"
  }
}
```

**Status Codes:** 200 · 403 (`FORBIDDEN`) · 409 (`ROLE_ALREADY_SET`) · 422 · 429.

**الأخطاء:** `VALIDATION_ERROR` (مثل `investment_range.min <= investment_range.max`) · `ROLE_ALREADY_SET` · `FORBIDDEN` · `RATE_LIMIT_EXCEEDED`.

---

## 2.3 POST `/api/profile/avatar` — رفع الصورة الشخصية (SRS-API-11)

**الصلاحية:** مصادق · **Rate Limit:** `upload.file` (L5) — 10/دقيقة

**الرؤوس:** `Content-Type: multipart/form-data`

**Request Body (multipart):**

| الحقل | النوع | إلزامي | القيود |
|-------|------|--------|--------|
| `avatar` | file | نعم | صورة `jpeg`/`png`/`webp` حتى 2MB — تُحفظ في Local Disk |

**Response 200 OK:**

```json
{
  "message": "تم تحديث الصورة الشخصية",
  "avatar_url": "https://api.ihyaa.app/storage/avatars/12_1700.jpg"
}
```

**Status Codes:** 200 · 422 (`FILE_TYPE_NOT_ALLOWED`/`FILE_TOO_LARGE`) · 429.

---

## 2.4 GET `/api/profile/{user}` — الملف العام لمستخدم (SRS-API-12)

**الصلاحية:** عام · **Rate Limit:** `public.browse` — 30/دقيقة لكل IP

**Response 200 OK:**

```json
{
  "user": {
    "id": 12,
    "name": "أحمد السالم",
    "role": "idea_owner",
    "avatar_url": "https://api.ihyaa.app/storage/avatars/12_1700.jpg",
    "bio": "طالب هندسة برمجيات، مهتم ببناء حلول ذكية للمنشآت الصغيرة"
  },
  "public_profile": {
    "university": "جامعة الملك سعود",
    "major": "علوم الحاسب",
    "skills": ["Laravel", "React", "AI"]
  }
}
```

> **الخصوصية:** لا يُعرض البريد الإلكتروني ولا `social_links` في الملف العام. للمستثمر: `investment_focus` و`investment_range` و`preferred_sectors` تُعرض كحقول عامة.

**Status Codes:** 200 · 404 (`NOT_FOUND`) · 429.

---

# 3. المشاريع (Projects) — SRS-API-13..17, 19

## 3.1 GET `/api/projects` — قائمة المشاريع (SRS-API-13)

**الصلاحية:** عام · **Rate Limit:** `public.browse` — 30/دقيقة لكل IP (burst 10)

**Query Parameters:**

| المعامل | النوع | الوصف |
|---------|------|-------|
| `page` | int | رقم الصفحة (افتراضي 1) |
| `per_page` | int | حجم الصفحة (افتراضي 12، أقصى 50) |
| `category` | string | مجال المشروع |
| `status` | string | حالة النشر: `published` فقط يظهر للعامة |
| `project_state` | string | `completed` \| `needs_development` \| `needs_funding` |
| `ai_score_min` | int | الحد الأدنى للتقييم (0–100) |
| `ai_score_max` | int | الحد الأقصى للتقييم (0–100) |
| `tags[]` | string[] | تصفية بالعلامات |
| `sort` | string | `latest` (افتراضي) \| `score` \| `views` |
| `order` | string | `desc` (افتراضي) \| `asc` |
| `q` | string | نص بحث (يُحوَّل إلى `/search` عند وجوده) |

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": 7,
      "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
      "description_excerpt": "منصة سحابية تساعد المنشآت الصغيرة على أتمتة خدمة العملاء باستخدام...",
      "category": "ai",
      "project_state": "needs_funding",
      "ai_score": 78.5,
      "cover_image_url": "https://api.ihyaa.app/storage/projects/7/cover.jpg",
      "views_count": 342,
      "created_at": "2026-07-20T11:00:00+03:00"
    }
  ],
  "meta": { "current_page": 1, "per_page": 12, "total": 42, "last_page": 4, "from": 1, "to": 12 },
  "links": { "first": "...?page=1", "last": "...?page=4", "prev": null, "next": "...?page=2" }
}
```

**Status Codes:** 200 · 429 · 500 (`INTERNAL_ERROR`).

> البطاقة تعرض الوصف مختصراً حتى 100 حرف (SRS-F07-02). المشاريع `draft`/`archived` لا تظهر (تظهر لمالكها عبر لوحة التحكم).

---

## 3.2 GET `/api/projects/{project}` — تفاصيل المشروع (SRS-API-14)

**الصلاحية:** عام + مصادق (حسب الإفصاح) · **Rate Limit:** `public.detail` — 60/دقيقة لكل IP (مخزّن مؤقتاً)

**Response 200 OK — زائر (visibility_level = 1):**

```json
{
  "visibility_level": 1,
  "project": {
    "id": 7,
    "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
    "description": "منصة سحابية تساعد المنشآت الصغيرة على أتمتة خدمة العملاء باستخدام الذكاء الاصطناعي...",
    "category": "ai",
    "project_state": "needs_funding",
    "tags": ["ai", "saas", "automation"],
    "github_url": "https://github.com/ahmed/ai-enabler",
    "video_url": "https://www.youtube.com/watch?v=abc123",
    "video_provider": "youtube",
    "budget_min": 150000,
    "budget_max": 300000,
    "views_count": 342,
    "owner": { "id": 12, "name": "أحمد السالم", "avatar_url": null },
    "files": [
      { "id": 31, "type": "image", "file_url": "https://api.ihyaa.app/storage/projects/7/cover.jpg", "mime_type": "image/jpeg", "file_size": 1843200 },
      { "id": 32, "type": "pdf", "file_url": "https://api.ihyaa.app/storage/projects/7/business-plan.pdf", "mime_type": "application/pdf", "file_size": 5242880 }
    ],
    "evaluation": { "overall_score": 78.5, "last_evaluation_at": "2026-07-22T15:30:00+03:00" }
  }
}
```

**Response 200 OK — مستخدم مسجّل غير مالك (visibility_level = 2):**

```json
{
  "visibility_level": 2,
  "project": { "...": "نفس الحقول أعلاه" },
  "evaluation": {
    "overall_score": 78.5,
    "dimensions_scores": {
      "technical_quality": 81.0,
      "innovation": 76.0,
      "market_viability": 79.0,
      "team_completeness": 72.0,
      "documentation": 84.0
    },
    "radar_data": { "labels": ["الجودة التقنية", "الابتكار", "الجدوى السوقية", "اكتمال الفريق", "التوثيق"], "values": [81, 76, 79, 72, 84] },
    "last_evaluation_at": "2026-07-22T15:30:00+03:00"
  }
}
```

**Response 200 OK — المالك أو المستثمر بعد الاتفاق (visibility_level = 3):**

```json
{
  "visibility_level": 3,
  "project": { "...": "نفس الحقول أعلاه" },
  "evaluation": {
    "id": 42,
    "overall_score": 78.5,
    "dimensions": {
      "technical_quality": {
        "score": 81.0,
        "sub_scores": { "code_structure": 85.0, "architecture": 80.0, "testing": 75.0, "ci_cd": 70.0, "documentation": 90.0 },
        "strengths": ["بنية نظيفة وقابلة للتوسع"],
        "weaknesses": ["غياب اختبارات التكامل"]
      }
    },
    "gap_analysis": {
      "technical_gaps": ["نقص اختبارات CI/CD"],
      "market_gaps": ["نموذج العمل غير موضح"],
      "team_gaps": ["يحتاج مطور جوال"],
      "documentation_gaps": ["خريطة الطريق غير مفصلة"]
    },
    "recommendations": {
      "immediate": ["توثيق نموذج العمل"],
      "short_term": ["إضافة اختبارات تلقائية"],
      "long_term": ["توسيع الفريق بمطور جوال"]
    },
    "required_skills": ["Flutter", "CI/CD", "Sales"],
    "report_pdf_url": "/api/projects/7/evaluations/42/report",
    "last_evaluation_at": "2026-07-22T15:30:00+03:00"
  }
}
```

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 200 | تفاصيل (حسب الإفصاح) |
| 404 | `NOT_FOUND` — غير موجود · `PROJECT_NOT_AVAILABLE` — محذوف أو غير منشور |
| 429 | `RATE_LIMIT_EXCEEDED` |

---

## 3.3 POST `/api/projects` — إنشاء مشروع (SRS-API-15)

**الصلاحية:** صاحب فكرة · **Rate Limit:** `idea-owner.write` — 10/دقيقة

**Request Body (JSON):**

```json
{
  "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
  "description": "منصة سحابية تساعد المنشآت الصغيرة على أتمتة خدمة العملاء باستخدام الذكاء الاصطناعي. تقدم المنصة مساعداً ذكياً يفهم لغة العملاء ويرد في ثوانٍ...",
  "category": "ai",
  "project_state": "needs_funding",
  "status": "published",
  "tags": ["ai", "saas", "automation"],
  "github_url": "https://github.com/ahmed/ai-enabler",
  "video_url": "https://www.youtube.com/watch?v=abc123",
  "video_provider": "youtube",
  "budget_min": 150000,
  "budget_max": 300000,
  "business_info": "نموذج الاشتراك الشهري، السوق المستهدف: المنشآت الصغيرة في السعودية (أكثر من مليون منشأة)، المنافسون: منصات أجنبية لا تدعم العربية"
}
```

| الحقل | النوع | إلزامي | القيود |
|-------|------|--------|--------|
| `title` | string | نعم | 5–120 حرفاً |
| `description` | string | نعم | **50–2000 حرف** |
| `category` | string | نعم | من قائمة المجالات |
| `project_state` | string | نعم | `completed` \| `needs_development` \| `needs_funding` |
| `status` | string | لا | `draft` \| `published` (افتراضي `published`) |
| `tags` | string[] | لا | حتى 10 علامات |
| `github_url` | string | لا | رابط صالح |
| `video_url` + `video_provider` | string | لا | YouTube/Vimeo فقط — وإلا `VIDEO_URL_INVALID` |
| `budget_min` / `budget_max` | number | لا | `NUMERIC(10,2)` · min ≤ max |
| `business_info` | string | لا | حتى 1000 حرف |

**Response 201 Created:**

```json
{
  "message": "تم إنشاء المشروع. بدأ التقييم الذكي — ستصل إشعاراً عند الاكتمال (خلال دقيقتين تقريباً)",
  "project": {
    "id": 7,
    "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
    "category": "ai",
    "project_state": "needs_funding",
    "status": "published",
    "ai_score": null,
    "created_at": "2026-08-02T10:20:00+03:00"
  },
  "evaluation": { "status": "processing", "eta_seconds": 120 }
}
```

> **تلقائياً بعد الإنشاء:** إدراج مهمة تقييم AI في Queue (Horizon) ← إشعار WebSocket عند الاكتمال (SRS-F03-02) ← مزامنة فهرس Meilisearch خلال < 5 ثوانٍ (SRS-F06-05).

**Status Codes:** 201 · 403 (`FORBIDDEN` — الدور ليس صاحب فكرة) · 422 (`VALIDATION_ERROR`, `VIDEO_URL_INVALID`) · 429.

---

## 3.4 PUT `/api/projects/{project}` — تحديث مشروع (SRS-API-16)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `idea-owner.write` — 10/دقيقة

**Request Body (جزئي — الحقول نفسها كالإنشاء):**

```json
{
  "description": "نسخة محدثة من الوصف بعد تطوير نموذج العمل...",
  "project_state": "needs_funding",
  "tags": ["ai", "saas", "automation", "arabic-nlp"]
}
```

**Response 200 OK:**

```json
{
  "message": "تم تحديث المشروع بنجاح",
  "project": { "id": 7, "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة", "updated_at": "2026-08-02T11:00:00+03:00" },
  "significant_changed": true,
  "re_evaluation_suggested": true
}
```

| الحقل | الوصف |
|-------|-------|
| `significant_changed` | `true` إذا تغيّر أحد الحقول الجوهرية: `description`، `tags`، `github_url`، `project_state`، `video_url` (SRS-F04-02) |
| `re_evaluation_suggested` | `true` → يعرض العميل التنبيه: "لقد أجريت تغييرات جوهرية. هل تريد إعادة تقييم مشروعك؟" — **لا تبدأ إعادة التقييم تلقائياً** |

> الحقول البسيطة (مثل `title`) لا تقترح إعادة تقييم (SRS-F04-02). التعديل يعيد مزامنة فهرس Meilisearch.

**Status Codes:** 200 · 403 (`FORBIDDEN` — ليس المالك) · 404 · 422 · 429.

---

## 3.5 DELETE `/api/projects/{project}` — حذف مشروع (Soft Delete) (SRS-API-17)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `idea-owner.write` — 10/دقيقة

**Response 200 OK:**

```json
{
  "message": "تم نقل المشروع إلى سلة المهملات. يمكنك استرجاعه خلال 30 يوماً",
  "trashed_until": "2026-09-01T11:05:00+03:00"
}
```

**Status Codes:** 200 · 403 (`FORBIDDEN`) · 404 (`NOT_FOUND`) · 429.

> الحذف النهائي التلقائي بعد 30 يوماً (أمر مجدول `projects:purge-trash`). يبقى المشروع مخفياً عن كل الواجهات العامة.

---

## 3.6 GET `/api/projects/{project}/evaluations` — سجل تقييمات المشروع (SRS-API-19)

**الصلاحية:** مصادق (مالك المشروع — كامل) · **Rate Limit:** `shared.read`

**Query Parameters:** `page` · `per_page` (افتراضي 20) · `status` (`completed`|`failed`|`partial` — اختياري)

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": 42,
      "project_id": 7,
      "version": 3,
      "status": "completed",
      "overall_score": 78.5,
      "dimensions_scores": { "technical_quality": 81.0, "innovation": 76.0, "market_viability": 79.0, "team_completeness": 72.0, "documentation": 84.0 },
      "model_used": "openai",
      "processing_time_ms": 94500,
      "created_at": "2026-07-22T15:30:00+03:00"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 3, "last_page": 1 }
}
```

> السجل كامل في قاعدة البيانات؛ **واجهة المقارنة تعرض آخر 5 `completed` فقط** (SRS-F04-03). التقييمات `failed` محفوظة للتدقيق.

**Status Codes:** 200 · 403 (`FORBIDDEN` — الإفصاح أقل من المستوى 3) · 404 · 429.

---

# 4. الملفات (Files) — SRS-API-18

## 4.1 POST `/api/projects/{project}/files` — رفع ملفات المشروع (SRS-API-18)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `upload.file` (L5) — 10/دقيقة

**الرؤوس:** `Content-Type: multipart/form-data`

**Request Body (multipart):**

| الحقل | النوع | إلزامي | القيود |
|-------|------|--------|--------|
| `files[]` | file[] | نعم | صور: حتى 5 ملفات × 5MB (`jpeg`/`png`/`webp`) · PDF: حتى 3 ملفات × 10MB — المجموع لكل مشروع |

**Response 200 OK:**

```json
{
  "message": "تم رفع 3 ملفات بنجاح، ورفض ملف واحد",
  "uploaded": [
    { "id": 31, "type": "image", "original_name": "cover.jpg", "file_url": "https://api.ihyaa.app/storage/projects/7/cover.jpg", "file_size": 1843200 },
    { "id": 32, "type": "image", "original_name": "dashboard.png", "file_url": "https://api.ihyaa.app/storage/projects/7/dashboard.png", "file_size": 2211840 },
    { "id": 33, "type": "pdf", "original_name": "business-plan.pdf", "file_url": "https://api.ihyaa.app/storage/projects/7/business-plan.pdf", "file_size": 5242880 }
  ],
  "rejected": [
    { "original_name": "malware.exe", "reason": "FILE_TYPE_NOT_ALLOWED" }
  ]
}
```

> التحقق من MIME الفعلي وليس الامتداد (SRS-NFR-08)؛ منع الملفات القابلة للتنفيذ. الحفظ في Local Disk (`storage/app/public/projects/{id}/`).

**Status Codes:** 200 (مع `rejected` للأجزاء المرفوضة) · 403 (`FORBIDDEN`) · 404 (`PROJECT_NOT_AVAILABLE`) · 422 · 429.

**الأخطاء:** `FILE_TYPE_NOT_ALLOWED` · `FILE_TOO_LARGE` · `VALIDATION_ERROR` (تجاوز سقف 5 صور/3 PDF لكل مشروع).

> **ملاحظة (ثغرة مقصودة في MVP):** لا توجد نقطة حذف ملف ضمن الـ 49 المعتمدة. الامتداد المقترح (بانتظار قرار المنتج): `DELETE /api/projects/{project}/files/{file}`.

---

# 5. التقييم (Evaluation) — SRS-API-44..48

> **المبدأ:** تقييم المشروع الأول يُطلق **تلقائياً** عند الإنشاء عبر Laravel Queue. نقاط API التالية للتحكم اليدوي وإعادة التقييم (SRS-F04).

## 5.1 POST `/api/projects/{project}/evaluate` — بدء تقييم AI (SRS-API-44)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `ai.evaluate` — 3/دقيقة لكل (user_id + project_id) + Cache 24 ساعة

**Request Body (JSON):**

```json
{
  "force": false
}
```

| الحقل | النوع | إلزامي | الوصف |
|-------|------|--------|--------|
| `force` | boolean | لا | `true` = تجاوز Cache 24 ساعة (لا يُنصح — تكلفة AI) |

**Response 202 Accepted:**

```json
{
  "message": "بدأ التقييم الذكي — ستتلقى إشعاراً فورياً عند الاكتمال",
  "evaluation": { "id": 43, "status": "processing" },
  "eta_seconds": 120
}
```

**Response 200 OK (Cache — خلال 24 ساعة من آخر تقييم):**

```json
{
  "message": "يوجد تقييم حديث صالح (أحدث من 24 ساعة)",
  "evaluation": { "id": 42, "status": "completed", "overall_score": 78.5 },
  "cached": true,
  "next_evaluation_at": "2026-07-23T15:30:00+03:00"
}
```

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 202 | بدأت المعالجة في Queue |
| 200 | أُعيد التقييم المخزَّن (Cache) |
| 403 | `FORBIDDEN` — ليس المالك |
| 404 | `PROJECT_NOT_AVAILABLE` |
| 409 | `EVALUATION_IN_PROGRESS` — تقييم قيد المعالجة حالياً |
| 422 | `VALIDATION_ERROR` — بيانات المشروع غير كافية للتقييم |
| 429 | `RATE_LIMIT_EXCEEDED` |

---

## 5.2 POST `/api/projects/{project}/re-evaluate` — إعادة تقييم يدوية (SRS-API-45)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `ai.evaluate` — 3/دقيقة لكل (user_id + project_id) · **القاعدة:** حد أدنى 24 ساعة بين التقييمين (SRS-AI-C01)

**Request Body (JSON):**

```json
{
  "confirm": true
}
```

| الحقل | النوع | إلزامي | الوصف |
|-------|------|--------|--------|
| `confirm` | boolean | نعم | تأكيد المستخدم قبل بدء إعادة التقييم (SRS-F04-01) |

**Response 202 Accepted:**

```json
{
  "message": "بدأت إعادة التقييم — ستتلقى إشعاراً عند الاكتمال",
  "evaluation": { "id": 44, "version": 4, "status": "processing" },
  "eta_seconds": 120
}
```

**Response 409 Conflict (منع التكرار):**

```json
{
  "code": "EVALUATION_RATE_LIMITED",
  "message": "لا يمكن إعادة التقييم قبل مرور 24 ساعة من آخر تقييم",
  "last_evaluation_at": "2026-07-22T15:30:00+03:00",
  "next_evaluation_at": "2026-07-23T15:30:00+03:00"
}
```

**Status Codes:** 202 · 200 (Cache عند `confirm:false` وعدم وجود تغييرات جوهرية) · 403 · 404 · 409 (`EVALUATION_RATE_LIMITED`, `EVALUATION_IN_PROGRESS`) · 422 (`confirm` مفقود) · 429.

---

## 5.3 POST `/api/projects/{project}/evaluations/{evaluation}/retry` — إعادة محاولة تقييم فاشل (SRS-API-46)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `ai.evaluate` — 3/دقيقة لكل (user_id + project_id)

**Response 202 Accepted:**

```json
{
  "message": "أُعيدت المحاولة — ستتلقى إشعاراً عند الاكتمال",
  "evaluation": { "id": 41, "status": "processing" }
}
```

**Status Codes:** 202 · 403 · 404 · 409 (`EVALUATION_NOT_FAILED` — "هذا التقييم ليس فاشلاً" / `EVALUATION_IN_PROGRESS`) · 429.

> Retry يخضع أيضاً لقاعدة Cache 24 ساعة إلا إذا كان آخر تقييم `failed` (SRS-AI-E05).

---

## 5.4 GET `/api/projects/{project}/evaluation-status` — حالة التقييم (SRS-API-47)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `shared.read`

**Response 200 OK (processing):**

```json
{
  "status": "processing",
  "evaluation_id": 43,
  "message": "جاري التقييم — متوسط الانتظار أقل من دقيقتين",
  "started_at": "2026-08-02T10:20:30+03:00",
  "eta_seconds": 75
}
```

**Response 200 OK (completed):**

```json
{
  "status": "completed",
  "evaluation_id": 42,
  "overall_score": 78.5,
  "last_evaluation_at": "2026-07-22T15:30:00+03:00",
  "next_evaluation_at": "2026-07-23T15:30:00+03:00"
}
```

**Response 200 OK (failed):**

```json
{
  "status": "failed",
  "evaluation_id": 41,
  "message": "تعذر إكمال التقييم. يمكنك إعادة المحاولة من صفحة المشروع",
  "last_evaluation_at": null,
  "next_evaluation_at": null
}
```

**Status Codes:** 200 · 403 · 404 · 429.

> يُستخدم مع WebSocket (`evaluation.completed`) للواجهة المتزامنة (SRS-F09-02).

---

## 5.5 GET `/api/projects/{project}/evaluations/{evaluation}/report` — تصدير تقرير PDF (SRS-API-48)

**الصلاحية:** صاحب المشروع دائماً / مستثمر بعد اتفاق `accepted` (مستوى إفصاح 3) · **Rate Limit:** `ai.report` — 10/دقيقة

**الرؤوس:** `Accept: application/pdf`

**Response 200 OK — `application/pdf` (ثنائي):**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="evaluation-7-42.pdf"
```

محتوى التقرير: التقييم الكلي، الرسم الراداري، درجات الأبعاد، تحليل الفجوات، التوصيات، المهارات المطلوبة — تنسيق احترافي (SRS-F05-04).

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 200 | ملف PDF |
| 403 | `FORBIDDEN` — "التقرير الكامل متاح لصاحب المشروع أو بعد إتمام الاتفاق" |
| 404 | `NOT_FOUND` |
| 409 | `AGREEMENT_NOT_READY` (مستثمر بطلب مقبول لكن المستند قيد الإنشاء) |
| 429 | `RATE_LIMIT_EXCEEDED` |

---

# 6. البحث والعلامات (Search & Tags) — SRS-API-20, 21, 49

## 6.1 GET `/api/search` — البحث المتقدم (SRS-API-20)

**الصلاحية:** عام · **Rate Limit:** `public.browse` — 30/دقيقة (burst 10) · **المحرك:** Meilisearch عبر Laravel Scout — استجابة < 200ms

**Query Parameters:**

| المعامل | النوع | الوصف |
|---------|------|-------|
| `q` | string | نص البحث (عربي/إنجليزي + تصحيح إملائي) |
| `category` | string | مجال المشروع |
| `ai_score_min` / `ai_score_max` | int | نطاق التقييم 0–100 |
| `project_state` | string | `completed` \| `needs_development` \| `needs_funding` |
| `tags[]` | string[] | تقنيات |
| `created_after` / `created_before` | date | نطاق تاريخ الإنشاء (ISO-8601) |
| `sort` | string | `relevance` (افتراضي) \| `score` \| `created_at` \| `views` |
| `order` | string | `desc` \| `asc` |
| `page` / `per_page` | int | ترقيم (افتراضي 12) |

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": 7,
      "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
      "description_excerpt": "منصة سحابية تساعد المنشآت الصغيرة على أتمتة خدمة العملاء...",
      "category": "ai",
      "project_state": "needs_funding",
      "ai_score": 78.5,
      "cover_image_url": "https://api.ihyaa.app/storage/projects/7/cover.jpg",
      "views_count": 342,
      "created_at": "2026-07-20T11:00:00+03:00"
    }
  ],
  "meta": { "current_page": 1, "per_page": 12, "total": 18, "last_page": 2 },
  "facets": {
    "categories": { "ai": 9, "fintech": 5, "saas": 4 },
    "project_states": { "needs_funding": 10, "needs_development": 6, "completed": 2 },
    "score_ranges": { "0-25": 0, "26-50": 2, "51-75": 7, "76-100": 9 }
  },
  "query": { "q": "ذكاء اصطناعي", "sort": "relevance", "order": "desc" }
}
```

> `facets` تُظهر عدد النتائج لكل فلتر (SRS-F06-03) · `query` يُرجع معايير البحث الحالية للمشاركة عبر الرابط (SRS-F06-06).

**Status Codes:** 200 · 429 · 503 (`INTERNAL_ERROR` — "تعذر الاتصال بمحرك البحث" مع إعادة المحاولة).

---

## 6.2 GET `/api/search/suggestions` — اقتراحات البحث (SRS-API-21)

**الصلاحية:** عام · **Rate Limit:** `public.browse` — 30/دقيقة

**Query Parameters:** `q` (نص جزئي — Debounce 300ms في الواجهة)

**Response 200 OK (حتى 5 اقتراحات):**

```json
{
  "data": [
    { "type": "project", "id": 7, "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة" },
    { "type": "tag", "value": "الذكاء الاصطناعي" },
    { "type": "project", "id": 9, "title": "مساعد ذكي لإدارة المخزون" }
  ]
}
```

**Status Codes:** 200 · 429.

---

## 6.3 GET `/api/tags/suggestions` — اقتراحات العلامات (SRS-API-49)

**الصلاحية:** عام · **Rate Limit:** `public.browse` — 30/دقيقة

**Query Parameters:** `q` (جزء من اسم العلامة — اختياري)

**Response 200 OK (حتى 10 علامات):**

```json
{
  "data": ["laravel", "laravel-api", "laravel-vue", "الذكاء الاصطناعي", "ai", "flutter"]
}
```

**Status Codes:** 200 · 429.

---

# 7. الاهتمام والاتفاق (Interest & Agreement) — SRS-API-22..27

## 7.1 POST `/api/projects/{project}/interest` — إرسال طلب اهتمام (SRS-API-22)

**الصلاحية:** مستثمر · **Rate Limit:** `investor.write` — 10/دقيقة

**Request Body (JSON):**

```json
{
  "interest_type": "investment",
  "message": "أرى في مشروعك فرصة واعدة للسوق السعودي، أرغب في مناقشة إمكانية الاستثمار المبكر"
}
```

| الحقل | النوع | إلزامي | القيود |
|-------|------|--------|--------|
| `interest_type` | string | نعم | `investment` \| `technical_development` \| `consultation` |
| `message` | string | لا | حتى 500 حرف |

**Response 201 Created:**

```json
{
  "message": "تم إرسال طلب الاهتمام بنجاح. سيصلك إشعار عند رد صاحب الفكرة",
  "interest": {
    "id": 156,
    "project_id": 7,
    "project_title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
    "interest_type": "investment",
    "message": "أرى في مشروعك فرصة واعدة للسوق السعودي، أرغب في مناقشة إمكانية الاستثمار المبكر",
    "status": "pending",
    "created_at": "2026-08-02T12:00:00+03:00"
  }
}
```

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 201 | أُرسل الطلب + إشعار WebSocket لصاحب الفكرة (`interest.created`) |
| 403 | `FORBIDDEN` — الدور ليس مستثمراً |
| 404 | `PROJECT_NOT_AVAILABLE` — "عذراً، هذا المشروع غير متاح حالياً" |
| 409 | `INTEREST_ALREADY_EXISTS` — "سبق إرسال طلب لهذا المشروع" |
| 422 | `PROFILE_INCOMPLETE` — "يرجى إكمال ملفك الشخصي أولاً" (يُشترط `investment_focus`) · `VALIDATION_ERROR` |
| 429 | `RATE_LIMIT_EXCEEDED` |

---

## 7.2 GET `/api/interests/received` — الطلبات الواردة (SRS-API-23)

**الصلاحية:** صاحب فكرة · **Rate Limit:** `shared.read` — 30/دقيقة

**Query Parameters:** `status` (`pending`\|`accepted`\|`rejected`\|`cancelled`) · `project_id` · `page`/`per_page`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": 156,
      "project_id": 7,
      "project_title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
      "investor": { "id": 5, "name": "سارة الحربي", "avatar_url": null },
      "interest_type": "investment",
      "message": "أرى في مشروعك فرصة واعدة للسوق السعودي",
      "status": "pending",
      "rejection_reason": null,
      "agreement_id": null,
      "created_at": "2026-08-02T12:00:00+03:00"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 3, "last_page": 1 }
}
```

**Status Codes:** 200 · 403 (ليس صاحب فكرة) · 429.

---

## 7.3 GET `/api/interests/sent` — الطلبات المرسلة (SRS-API-24)

**الصلاحية:** مستثمر · **Rate Limit:** `shared.read` — 60/دقيقة

**Query Parameters:** `status` · `page`/`per_page`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": 156,
      "project_id": 7,
      "project_title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
      "project_ai_score": 78.5,
      "interest_type": "investment",
      "message": "أرى في مشروعك فرصة واعدة",
      "status": "rejected",
      "rejection_reason": "نعتذر، المشروع محجوز لمستثمر استراتيجي حالياً",
      "agreement_id": null,
      "created_at": "2026-08-02T12:00:00+03:00"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 5, "last_page": 1 }
}
```

> يعرض `rejection_reason` عند الرفض (SRS-F11-03). المستثمر يرى البريد الإلكتروني لصاحب الفكرة فقط بعد القبول (الكشف المتبادل).

**Status Codes:** 200 · 403 · 429.

---

## 7.4 PUT `/api/interests/{interest}/accept` — قبول الطلب (SRS-API-25)

**الصلاحية:** صاحب فكرة (مالك المشروع) · **Rate Limit:** `shared.write` — 10/دقيقة

**Response 200 OK:**

```json
{
  "message": "تم قبول الطلب — أُنشئ مستند الاتفاق وتم الكشف المتبادل عن البريد الإلكتروني",
  "interest": { "id": 156, "status": "accepted", "accepted_at": "2026-08-02T14:00:00+03:00" },
  "agreement": {
    "id": 21,
    "pdf_url": "/api/agreements/21",
    "idea_owner": { "name": "أحمد السالم", "email": "ahmed@example.com" },
    "investor": { "name": "سارة الحربي", "email": "sara@gmail.com" }
  }
}
```

> عند القبول (SRS-F08-04/05 + BR-05): إنشاء مستند PDF ثابت بأسماء الطرفين (خلال < 5 ثوانٍ) + حفظ في Local Disk + الكشف المتبادل عن البريد + إشعار المستثمر ("تم قبول طلبك") + فتح مستوى الإفصاح 3 للمستثمر.

**Status Codes:** 200 · 403 (`FORBIDDEN`) · 404 · 409 (`INTEREST_NOT_PENDING`, `INTEREST_CANCELLED` — "عذراً، تم إلغاء هذا الطلب من قبل المستثمر") · 429.

---

## 7.5 PUT `/api/interests/{interest}/reject` — رفض الطلب (SRS-API-26)

**الصلاحية:** صاحب فكرة (مالك المشروع) · **Rate Limit:** `shared.write` — 10/دقيقة

**Request Body (JSON):**

```json
{
  "rejection_reason": "نعتذر، نفضل تأجيل التعاون حالياً — نركز على تطوير النموذج الأولي"
}
```

**Response 200 OK:**

```json
{
  "message": "تم رفض الطلب وإشعار المستثمر",
  "interest": { "id": 156, "status": "rejected", "rejected_at": "2026-08-02T14:05:00+03:00" }
}
```

**Status Codes:** 200 · 403 · 404 · 409 (`INTEREST_NOT_PENDING`, `INTEREST_CANCELLED`) · 422 (`rejection_reason` > 500 حرف) · 429.

---

## 7.6 GET `/api/agreements/{agreement}` — مستند الاتفاق (SRS-API-27)

**الصلاحية:** الطرفان فقط (صاحب فكرة أو المستثمر) · **Rate Limit:** `shared.read` — 10/دقيقة

**Response 200 OK — `application/pdf`:**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="agreement-21.pdf"
```

محتوى المستند: ثابت — اسم صاحب الفكرة + اسم المستثمر + تاريخ الاتفاق (لا توقيع إلكتروني، لا NDA).

**Status Codes:** 200 · 403 (`FORBIDDEN` — "ليس لديك صلاحية الوصول إلى هذا المستند" + تسجيل المحاولة في سجلات الأمان UC-07 E3) · 404 · 429.

---

# 8. الإشعارات (Notifications) — SRS-API-28..31

## 8.1 GET `/api/notifications` — قائمة الإشعارات (SRS-API-28)

**الصلاحية:** مصادق · **Rate Limit:** `shared.read` — 30/دقيقة

**Query Parameters:** `limit` (1–50 — الواجهة تستخدم `limit=5` للجرس) · `page`/`per_page` (20 للصفحة الكاملة)

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": 301,
      "type": "interest.created",
      "title": "طلب اهتمام جديد",
      "body": "أرسلت سارة الحربي طلب اهتمام (استثمار) على مشروعك «منصة تمكين الذكاء الاصطناعي»",
      "data": { "interest_id": 156, "project_id": 7 },
      "is_critical": true,
      "read_at": null,
      "created_at": "2026-08-02T12:00:00+03:00"
    },
    {
      "id": 300,
      "type": "evaluation.completed",
      "title": "اكتمل تقييم مشروعك",
      "body": "حصل مشروعك «منصة تمكين الذكاء الاصطناعي» على تقييم 78.5/100",
      "data": { "evaluation_id": 42, "overall_score": 78.5 },
      "is_critical": true,
      "read_at": "2026-08-02T12:01:00+03:00",
      "created_at": "2026-07-22T15:30:00+03:00"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 12, "last_page": 1 },
  "unread_count": 3
}
```

**أنواع الإشعارات:** `interest.created` (حرج) · `evaluation.completed` (حرج) · `interest.accepted` · `interest.rejected` · `evaluation.retry` · `project.updated` · `analysis.completed`.

**Status Codes:** 200 · 401 · 429.

---

## 8.2 PUT `/api/notifications/{notification}/read` — تعيين كمقروء (SRS-API-29)

**الصلاحية:** مصادق (صاحب الإشعار) · **Rate Limit:** `shared.read` — 30/دقيقة

**Response 200 OK:**

```json
{
  "message": "تم تعيين الإشعار كمقروء",
  "notification": { "id": 301, "read_at": "2026-08-02T12:05:00+03:00" }
}
```

**Status Codes:** 200 · 403 (`FORBIDDEN` — إشعار لمستخدم آخر) · 404 · 429.

---

## 8.3 PUT `/api/notifications/read-all` — تعيين الكل كمقروء (SRS-API-30)

**الصلاحية:** مصادق · **Rate Limit:** `shared.write` — 10/دقيقة

**Response 200 OK:**

```json
{
  "message": "تم تعيين جميع الإشعارات كمقروءة",
  "updated_count": 3
}
```

**Status Codes:** 200 · 401 · 429.

---

## 8.4 GET `/api/notifications/unread-count` — عدد غير المقروء (SRS-API-31)

**الصلاحية:** مصادق · **Rate Limit:** `shared.read` — 30/دقيقة

**Response 200 OK:**

```json
{
  "count": 3
}
```

**Status Codes:** 200 · 401 · 429.

> يُستخدم في Badge الجرس (SRS-F09-01) ويُحدَّث عبر WebSocket عند الأحداث الحرجة.

---

# 9. لوحات التحكم (Dashboards) — SRS-API-32..39

## 9.1 GET `/api/saved-projects` — المشاريع المحفوظة (SRS-API-32)

**الصلاحية:** مستثمر · **Rate Limit:** `shared.read` — 60/دقيقة

**Query Parameters:** `page`/`per_page`

**Response 200 OK:**

```json
{
  "data": [
    {
      "project": {
        "id": 7,
        "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة",
        "category": "ai",
        "project_state": "needs_funding",
        "ai_score": 78.5,
        "cover_image_url": "https://api.ihyaa.app/storage/projects/7/cover.jpg",
        "views_count": 342
      },
      "saved_at": "2026-07-25T09:00:00+03:00"
    }
  ],
  "meta": { "current_page": 1, "per_page": 12, "total": 4, "last_page": 1 }
}
```

**Status Codes:** 200 · 403 (ليس مستثمراً) · 429.

---

## 9.2 POST `/api/projects/{project}/save` — حفظ مشروع (SRS-API-33)

**الصلاحية:** مستثمر · **Rate Limit:** `investor.write` — 10/دقيقة

**Response 200 OK:**

```json
{
  "message": "تم حفظ المشروع في قائمتك",
  "saved": true
}
```

**Response 200 OK (محفوظ مسبقاً — Idempotent):**

```json
{
  "message": "المشروع محفوظ مسبقاً",
  "saved": true,
  "already_saved": true
}
```

**Status Codes:** 200 · 403 · 404 (`PROJECT_NOT_AVAILABLE`) · 429.

---

## 9.3 DELETE `/api/projects/{project}/save` — إزالة من المحفوظات (SRS-API-34)

**الصلاحية:** مستثمر · **Rate Limit:** `investor.write` — 10/دقيقة

**Response 200 OK:**

```json
{
  "message": "تمت إزالة المشروع من المحفوظات",
  "saved": false
}
```

**Status Codes:** 200 · 403 · 404 · 429.

---

## 9.4 GET `/api/trashed-projects` — سلة المهملات (SRS-API-35)

**الصلاحية:** صاحب فكرة · **Rate Limit:** `shared.read` — 20/دقيقة

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": 11,
      "title": "تطبيق حجز مواعيد العيادات",
      "category": "healthtech",
      "project_state": "needs_development",
      "ai_score": 64.0,
      "deleted_at": "2026-07-25T10:00:00+03:00",
      "auto_delete_at": "2026-08-24T10:00:00+03:00",
      "days_remaining": 22
    }
  ],
  "meta": { "current_page": 1, "per_page": 12, "total": 1, "last_page": 1 }
}
```

**Status Codes:** 200 · 403 · 429.

---

## 9.5 POST `/api/trashed-projects/{project}/restore` — استرجاع مشروع (SRS-API-36)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `shared.write` — 10/دقيقة

**Response 200 OK:**

```json
{
  "message": "تم استرجاع المشروع بنجاح",
  "project": { "id": 11, "title": "تطبيق حجز مواعيد العيادات", "status": "published" }
}
```

**Status Codes:** 200 · 403 · 404 · 410 (`NOT_FOUND` — "انتهت مهلة الاسترجاع" بعد 30 يوماً) · 429.

---

## 9.6 DELETE `/api/trashed-projects/{project}/force` — حذف نهائي (SRS-API-37)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `shared.write` — 10/دقيقة

**Response 200 OK:**

```json
{
  "message": "تم حذف المشروع نهائياً (لا يمكن التراجع)"
}
```

**Status Codes:** 200 · 403 · 404 · 429.

> الحذف اليدوي قبل انتهاء الـ 30 يوماً مسموح (SRS-F10-05). الحذف النهائي يزيل المشروع وملفاته وبيانات التقييم المرتبطة.

---

## 9.7 GET `/api/dashboard/idea-owner` — لوحة صاحب الفكرة (SRS-API-38)

**الصلاحية:** صاحب فكرة · **Rate Limit:** `dashboard` — 20/دقيقة

**Response 200 OK:**

```json
{
  "stats": {
    "total_projects": 3,
    "average_score": 71.2,
    "total_interests": 8,
    "accepted_interests": 2,
    "pending_interests": 4,
    "trash_count": 1
  },
  "projects": [
    { "id": 7, "title": "منصة تمكين الذكاء الاصطناعي للمنشآت الصغيرة", "ai_score": 78.5, "project_state": "needs_funding", "status": "published", "cover_image_url": null }
  ],
  "activities": {
    "data": [
      { "type": "interest.created", "title": "طلب اهتمام جديد من سارة الحربي", "created_at": "2026-08-02T12:00:00+03:00" },
      { "type": "evaluation.completed", "title": "اكتمل تقييم «منصة تمكين الذكاء الاصطناعي» — 78.5", "created_at": "2026-07-22T15:30:00+03:00" }
    ],
    "meta": { "current_page": 1, "per_page": 10, "total": 23, "last_page": 3 }
  },
  "quick_actions": ["add_project", "view_projects", "manage_interests"]
}
```

> `activities` آخر 10 أحداث في اللوحة؛ "عرض كل الأحداث" يفتح الصفحة الكاملة بـ 20/صفحة عبر معامل `page` (SRS-F10-03). `quick_actions` ثابتة (إرشادية للواجهة).

**Status Codes:** 200 · 403 · 429.

---

## 9.8 GET `/api/dashboard/investor` — لوحة المستثمر (SRS-API-39)

**الصلاحية:** مستثمر · **Rate Limit:** `dashboard` — 20/دقيقة

**Response 200 OK:**

```json
{
  "stats": {
    "sent_interests": 5,
    "accepted_interests": 1,
    "pending_interests": 2,
    "rejected_interests": 2,
    "saved_projects": 4
  },
  "recommendations": [
    { "id": 12, "title": "منصة تحليل عقاري بالذكاء الاصطناعي", "category": "real_estate", "ai_score": 82.0, "project_state": "needs_funding", "cover_image_url": null }
  ],
  "sent_interests": [
    { "id": 156, "project_id": 7, "project_title": "منصة تمكين الذكاء الاصطناعي", "status": "pending", "created_at": "2026-08-02T12:00:00+03:00" }
  ],
  "saved_projects": [
    { "project_id": 7, "title": "منصة تمكين الذكاء الاصطناعي", "ai_score": 78.5, "saved_at": "2026-07-25T09:00:00+03:00" }
  ],
  "feed": [
    { "type": "evaluation.completed", "project_id": 7, "project_title": "منصة تمكين الذكاء الاصطناعي", "body": "تقييم جديد: 78.5/100", "created_at": "2026-07-22T15:30:00+03:00" }
  ]
}
```

> `recommendations` حتى 10 مشاريع مطابقة لمجال `investment_focus` (SRS-F11-01). `feed` آخر تحديثات على المشاريع المتفاعل معها (SRS-F11-05).

**Status Codes:** 200 · 403 · 429.

---

# 10. تحليلات المشرف (Admin) — SRS-API-40..41

## 10.1 GET `/api/admin/analytics` — لوحة التحليلات (SRS-API-40)

**الصلاحية:** مشرف · **Rate Limit:** `admin.read` — 60/دقيقة

**Response 200 OK:**

```json
{
  "users": {
    "total": 142,
    "by_role": { "idea_owner": 98, "investor": 43, "admin": 1 },
    "active_last_7_days": [
      { "date": "2026-07-27", "count": 31 },
      { "date": "2026-07-28", "count": 38 },
      { "date": "2026-07-29", "count": 42 },
      { "date": "2026-07-30", "count": 35 },
      { "date": "2026-07-31", "count": 47 },
      { "date": "2026-08-01", "count": 51 },
      { "date": "2026-08-02", "count": 29 }
    ]
  },
  "projects": {
    "total": 50,
    "by_status": { "draft": 5, "published": 42, "archived": 3 },
    "by_category": { "ai": 12, "fintech": 8, "healthtech": 6, "saas": 5, "other": 19 }
  },
  "evaluations": {
    "total": 64,
    "average_score": 71.4,
    "success_rate": 0.92
  },
  "interests": {
    "total": 31,
    "by_status": { "pending": 12, "accepted": 6, "rejected": 9, "cancelled": 4 }
  },
  "generated_at": "2026-08-02T12:30:00+03:00"
}
```

> بيانات لحظية عند تحميل الصفحة فقط (وليس فورياً — SRS-F12-01) · `by_category` يُرسم دائرياً (SRS-F12-01) · `active_last_7_days` خطي (SRS-F12-02).

**Status Codes:** 200 · 403 (ليس مشرفاً) · 429.

---

## 10.2 GET `/api/admin/analytics/export` — تصدير CSV (SRS-API-41)

**الصلاحية:** مشرف · **Rate Limit:** `admin.export` — 10/دقيقة

**Response 200 OK — `text/csv`:**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="ihyaa-analytics-2026-08-02.csv"

section,key,value
users,total,142
users,idea_owner,98
users,investor,43
projects,total,50
projects,published,42
evaluations,average_score,71.4
interests,total,31
interests,accepted,6
```

**Status Codes:** 200 · 403 · 429.

---

# 11. وكيل AI: تحليل المشاريع (AI Agent) — SRS-API-42..43

## 11.1 POST `/api/ai/analyze/{project}` — طلب تحليل متقدم (SRS-API-42)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `ai.analyze` — 3/دقيقة لكل (user_id + project_id)

**الشرط المسبق:** وجود تقييم `completed` واحد على الأقل للمشروع (UC-13).

**Request Body (JSON):**

```json
{
  "analysis_type": "swot"
}
```

| الحقل | النوع | إلزامي | القيود |
|-------|------|--------|--------|
| `analysis_type` | string | نعم | `competitive` \| `swot` \| `market` \| `comparison` |

**Response 202 Accepted:**

```json
{
  "message": "بدأ التحليل — ستتلقى إشعاراً عند اكتماله (معالجة غير متزامنة)",
  "artifact": { "id": 9, "project_id": 7, "analysis_type": "swot", "status": "processing" }
}
```

**Status Codes:**

| الكود | الحالة |
|-------|--------|
| 202 | بدأ التحليل في Queue |
| 403 | `FORBIDDEN` — ليس المالك |
| 404 | `NOT_FOUND` |
| 409 | `ANALYSIS_IN_PROGRESS` — "لا يزال التحليل قيد المعالجة" (UC-13 E2) |
| 422 | `EVALUATION_REQUIRED` — "يتطلب المشروع تقييماً مكتملاً واحداً على الأقل قبل التحليل" · `VALIDATION_ERROR` |
| 429 | `RATE_LIMIT_EXCEEDED` |

---

## 11.2 GET `/api/ai/analysis/{artifact}` — عرض تقرير التحليل (SRS-API-43)

**الصلاحية:** صاحب فكرة (مالكه) · **Rate Limit:** `ai.report` — 10/دقيقة

**Response 200 OK (مثال SWOT — مخرجات نصية وقوالب فقط):**

```json
{
  "artifact": {
    "id": 9,
    "project_id": 7,
    "analysis_type": "swot",
    "version": 1,
    "status": "completed",
    "artifact_data": {
      "strengths": [
        "حل مبتكر بلغة عربية أصيلة في سوق يفتقر للمنافسين المحليين",
        "فريق مؤسس يمتلك خبرة تقنية في NLP"
      ],
      "weaknesses": [
        "نموذج العمل غير موثق بشكل كافٍ",
        "لا يوجد نموذج أولي قابل للعرض"
      ],
      "opportunities": [
        "برامج دعم المنشآت الصغيرة في رؤية 2030",
        "نمو سوق SaaS في الشرق الأوسط بنسبة 25% سنوياً"
      ],
      "threats": [
        "دخول منصات عالمية مدعومة بالعربية",
        "تقلب تكاليف نماذج الذكاء الاصطناعي"
      ],
      "recommendations": [
        "بناء نموذج أولي خلال 60 يوماً والتركيز على عميل تجريبي واحد في القطاع الصحي"
      ]
    },
    "created_at": "2026-08-02T13:00:00+03:00"
  }
}
```

**Status Codes:** 200 · 403 · 404 · 409 (`ANALYSIS_IN_PROGRESS` — "لا يزال التحليل قيد المعالجة") · 429.

> التحديث عند الطلب فقط عبر `POST /ai/analyze` (زر "تحديث التحليل" — SRS-F15-05). لا MCP خارجي — نصوص وقوالب فقط (SRS-AI-M03).

---

# 12. المداخل الصحية (Health) — L7

## 12.1 GET `/health` — فحص الصحة

**الصلاحية:** عام (IP داخلي/أداة مراقبة فقط في الإنتاج) · **Rate Limit:** بلا

**Response 200 OK:**

```json
{
  "status": "ok",
  "services": { "database": "up", "cache": "up", "queue": "up", "search": "up" },
  "timestamp": "2026-08-02T13:00:00+03:00"
}
```

**Status Codes:** 200 (كل الخدمات) · 503 (أي خدمة متعطلة — مع `services` التفصيلي).

## 12.2 GET `/ready` — جاهزية استقبال الحركة

**Response 200 OK:** `{ "status": "ready" }` · **Response 503:** `{ "status": "maintenance" }` أثناء الصيانة.

---

*نهاية الوثيقة — 49 نقطة API + نقطتا Health · متوافقة مع `openapi.yaml` و`enums.md` و`routes.md`*
