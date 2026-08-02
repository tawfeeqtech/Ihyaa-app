# مخطط علاقات الكيانات (ER Diagram) — منصة إحياء (Ihyaa)

**الإصدار:** 1.0 · **التاريخ:** 2026-08-02
**القاعدة:** MySQL 8 (InnoDB, utf8mb4) · **الإطار:** Laravel 13 + PHP 8.3
**المراجع:** `requirements/srs-mvp-v3.md` §5.4.4 (SRS-DB-01..10) · `docs/design-decisions.md` (مصدر الحقيقة) · `docs/api/enums.md` (عقود API المعتمدة)

---

## 1. النطاق

قاعدة بيانات MVP لمنصة إحياء — **10 جداول**:

| # | الجدول | الغرض |
|---|--------|-------|
| 1 | `roles` | أدوار المستخدمين: `idea_owner`، `investor`، `admin` (3 صفوف عبر seeder) |
| 2 | `categories` | تصنيفات المشاريع (15 تصنيفاً عربياً عبر seeder) |
| 3 | `users` | المستخدمون + حقول الملف الشخصي حسب الدور + حقول OTP/OAuth |
| 4 | `projects` | المشاريع (soft delete — سلة مهملات 30 يوماً) |
| 5 | `project_files` | ملفات المشروع (صور/PDF — Local Disk) |
| 6 | `ai_evaluations` | سجل تقييمات AI (5 أبعاد + معايير فرعية) |
| 7 | `interests` | طلبات الاهتمام + مستند الاتفاق PDF |
| 8 | `saved_projects` | مشاريع المستثمر المحفوظة |
| 9 | `notifications` | الإشعارات الداخلية (`is_critical` → Reverb) |
| 10 | `password_resets` | إعادة تعيين كلمة المرور (صلاحية ساعة واحدة) |

> **تكييفات معتمدة على SRS §5.4.4 (بموجب قرارات التصميم):**
> - دُمج جدول `user_profiles` (SRS-DB-02) في `users` — حقول الملف الشخصي قليلة ولا تستحق جدولاً مستقلاً في MVP.
> - دُمج جدول `agreements` (SRS-DB-07) في `interests.agreement_pdf_path` — اتفاق واحد لكل طلب مقبول، والمسار يُحذف عند الإلغاء بعد القبول (UC-07 E2).
> - جدول `ai_agent_artifacts` (SRS-DB-09 — وكيل تحليل F15) خارج نطاق الجداول العشرة؛ يُضاف كجدول حادي عشر عند تنفيذ F15 في Sprint 3.
> - `users.role_id` بدل `users.role` (enum) — تطبيع الدور في جدول `roles` (قرار هذه الوثيقة، ويتوافق مع `EnsureRole` في `routes.md`).
> - `categories` جدول بدل حقل نصي مفتوح (enums.md §1.12 كان سلسلة نصية) — تطبيع بتوجيه المشروع: 15 تصنيفاً قابلاً للإدارة.

---

## 2. المخطط (Mermaid ER Diagram)

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigns (role_id)"
    USERS ||--o{ PROJECTS : "owns (user_id — idea_owner)"
    CATEGORIES ||--o{ PROJECTS : "classifies (category_id)"
    USERS ||--o{ INTERESTS : "sends (investor_id)"
    PROJECTS ||--o{ INTERESTS : "receives (project_id)"
    USERS ||--o{ SAVED_PROJECTS : "saves (user_id — investor)"
    PROJECTS ||--o{ SAVED_PROJECTS : "is saved by (project_id)"
    USERS ||--o{ NOTIFICATIONS : "receives (user_id)"
    PROJECTS ||--o{ PROJECT_FILES : "contains (project_id)"
    PROJECTS ||--o{ AI_EVALUATIONS : "has evaluation history (project_id)"

    ROLES {
        bigint id PK
        varchar(50) name UK "idea_owner | investor | admin"
        varchar(50) display_name "صاحب فكرة | مستثمر | مشرف"
        varchar(255) description "nullable"
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIES {
        bigint id PK
        varchar(100) name_ar "الاسم بالعربية"
        varchar(100) name_en "الاسم بالإنجليزية"
        varchar(120) slug UK "ecommerce | edtech | ai …"
        varchar(50) icon "أيقونة Phosphor"
        smallint sort_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        bigint id PK
        bigint role_id FK "→ roles.id"
        varchar(100) name
        varchar(190) email UK
        varchar(255) password "nullable — حسابات OAuth فقط"
        timestamp email_verified_at "nullable — التفعيل إلزامي (SRS-F01-02)"
        varchar(30) provider "google | github | linkedin"
        varchar(190) provider_id "nullable"
        char(6) otp_code "nullable"
        timestamp otp_expires_at "صلاحية دقيقة واحدة"
        tinyint otp_attempts "محاولات الإدخال"
        timestamp otp_last_sent_at "حد الإعادة 3/دقيقة"
        varchar(255) avatar_path "nullable"
        text bio "nullable"
        varchar(190) university "صاحب فكرة"
        varchar(190) major "صاحب فكرة"
        varchar(190) investment_focus "مستثمر"
        json investment_range "مستثمر — {min, max}"
        json preferred_sectors "مستثمر — قائمة قطاعات"
        timestamp last_login_at "تحليلات النشاط 7 أيام"
        boolean is_active
        varchar(100) remember_token
        timestamp created_at
        timestamp updated_at
    }

    PROJECTS {
        bigint id PK
        bigint user_id FK "→ users.id (المالك — idea_owner)"
        bigint category_id FK "→ categories.id"
        varchar(190) title
        text description "50–2000 حرف"
        enum status "completed | needs_development | needs_funding"
        enum publication_status "draft | published | archived — افتراضي published"
        json tags "حتى 10 وسوم"
        varchar(255) github_url "nullable"
        varchar(255) video_url "YouTube/Vimeo فقط"
        enum video_provider "youtube | vimeo — nullable"
        decimal(12,2) budget_min "nullable"
        decimal(12,2) budget_max "nullable"
        tinyint visibility_level "1 زائر | 2 مسجل | 3 بعد الاتفاق (افتراضي 3)"
        decimal(5,2) ai_score "0–100 — مرآة لآخر تقييم مكتمل"
        bigint view_count "للفرز حسب المشاهدات"
        timestamp last_evaluation_at "فحص كاش 24 ساعة"
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "سلة مهملات 30 يوماً"
    }

    PROJECT_FILES {
        bigint id PK
        bigint project_id FK "→ projects.id"
        enum type "image | pdf | document"
        varchar(255) file_path "داخل storage/app/public"
        varchar(255) original_name
        varchar(100) mime_type "MIME حقيقي — SRS-NFR-08"
        bigint file_size "بايت"
        boolean is_cover "صورة الغلاف في البطاقة"
        smallint sort_order
        timestamp created_at
        timestamp updated_at
    }

    AI_EVALUATIONS {
        bigint id PK
        bigint project_id FK "→ projects.id"
        int version "يتزايد لكل محاولة (حتى الفاشلة)"
        enum status "processing | completed | failed | partial"
        decimal(5,2) overall_score "0–100 — nullable"
        json scores "5 أبعاد + معايير فرعية (مخطط SRS 5.4.6.3)"
        json gap_analysis "technical | market | team | documentation"
        json recommendations "immediate | short_term | long_term"
        json required_skills
        decimal(5,2) confidence_score
        json warnings
        enum model_used "openai | claude — nullable"
        int processing_time_ms
        text error_message "للتدقيق — SRS-F03-05"
        timestamp created_at
        timestamp updated_at
    }

    INTERESTS {
        bigint id PK
        bigint project_id FK "→ projects.id"
        bigint investor_id FK "→ users.id"
        enum interest_type "investment | technical_development | consultation"
        varchar(500) message "nullable"
        enum status "pending | accepted | rejected | cancelled"
        varchar(255) rejection_reason "nullable"
        varchar(255) agreement_pdf_path "PDF الثابت — Local Disk — nullable"
        timestamp accepted_at
        timestamp rejected_at
        timestamp cancelled_at
        timestamp created_at
        timestamp updated_at
    }

    SAVED_PROJECTS {
        bigint id PK
        bigint user_id FK "→ users.id (مستثمر)"
        bigint project_id FK "→ projects.id"
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK "→ users.id"
        varchar(100) type "interest_received | evaluation_completed …"
        varchar(190) title
        text body "nullable"
        json data "رابط/معرّفات مرتبطة"
        boolean is_critical "true → بث فوري عبر Reverb"
        timestamp read_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    PASSWORD_RESETS {
        varchar(190) email "مفهرس — لا FK (لا نمنع حذف المستخدم)"
        varchar(64) token "مخزن كـ hash"
        timestamp created_at "صلاحية ساعة واحدة"
    }
```

---

## 3. جدول العلاقات

| # | من | إلى | العددية | العمود | الدلالة | حذف المرجع |
|---|----|-----|---------|--------|---------|------------|
| R1 | `roles` | `users` | 1 : N | `users.role_id` | دور المستخدم | CASCADE |
| R2 | `users` | `projects` | 1 : N | `projects.user_id` | صاحب فكرة ← مشاريعه | CASCADE |
| R3 | `categories` | `projects` | 1 : N | `projects.category_id` | تصنيف المشروع | RESTRICT |
| R4 | `projects` | `project_files` | 1 : N | `project_files.project_id` | ملفات المشروع | CASCADE |
| R5 | `projects` | `ai_evaluations` | 1 : N | `ai_evaluations.project_id` | سجل التقييمات | CASCADE |
| R6 | `users` | `interests` | 1 : N | `interests.investor_id` | مستثمر ← طلباته | CASCADE |
| R7 | `projects` | `interests` | 1 : N | `interests.project_id` | الطلبات الواردة للمشروع | CASCADE |
| R8 | `users` | `saved_projects` | 1 : N | `saved_projects.user_id` | محفوظات المستثمر | CASCADE |
| R9 | `projects` | `saved_projects` | 1 : N | `saved_projects.project_id` | مشروع محفوظ | CASCADE |
| R10 | `users` | `notifications` | 1 : N | `notifications.user_id` | إشعارات المستخدم | CASCADE |

**قيود الحذف:** `CASCADE` للملفات والتقييمات والطلبات والمحفوظات (تختفي مع المشروع/المستخدم) · `RESTRICT` للتصنيف (لا حذف لتصنيف مستخدم بواسطة مشاريع). `password_resets` بلا FK عمداً (جدول أدوات — لا يمنع حذف المستخدم).

---

## 4. مصفوفة الإفصاح (`visibility_level` — SRS-F05-05 + design-decisions §5.2)

| القيمة | المعنى | من يرى التقرير الكامل |
|--------|--------|----------------------|
| `1` (عام) | التقرير الكامل علني | الزوار والجميع |
| `2` (مسجل) | التقرير الكامل للمسجلين | أي مستخدم مسجل الدخول |
| `3` (بعد الاتفاق) — **الافتراضي** | الكشف الكامل بعد الاتفاق فقط | صاحب المشروع **دائماً** + المستثمر بعد قبول طلبه |

في المستوى الافتراضي (3): الزائر يرى التقييم الكلي فقط · المسجل يرى الكلي + درجات الأبعاد الخمسة + الرسم الراداري · بعد الاتفاق يرى كل شيء (فجوات، توصيات، مهارات، SWOT، تصدير PDF — `SRS-API-48`). **استثناء دائم:** صاحب المشروع يرى كل شيء لمشروعه.

---

## 5. آلة حالات `interests`

```
pending ──قبول (صاحب الفكرة)──▶ accepted   (إنشاء PDF + كشف البريد المتبادل)
pending ──رفض (صاحب الفكرة)──▶ rejected   (سبب اختياري)
pending ──إلغاء (المستثمر)──▶ cancelled
accepted ──إلغاء (المستثمر)──▶ cancelled  (حذف ملف PDF + إخفاء البريد — UC-07 E2)
```

**منع التكرار (SRS-F08-03):** `UNIQUE(project_id, active_key)` حيث `active_key` عمود مولّد (Generated Column):
`active_key = investor_id` فقط عندما تكون الحالة `pending` أو `accepted`، و`NULL` للرفض/الإلغاء — فيُمنع طلب نشط مكرر (قيم NULL لا تتعارض في MySQL) ويُسمح بإعادة الإرسال بعد الرفض أو الإلغاء (UC-06 E1).

---

## 6. مزامنة بيانات التقييم (سجل غير محدود — SRS-DB-05)

- `ai_evaluations.version` يتزايد تلقائياً لكل محاولة (بما فيها إعادة المحاولة بعد الفشل — سجل التدقيق كامل).
- عند اكتمال تقييم (`status = completed`): تُحدَّث `projects.ai_score` و`projects.last_evaluation_at` — مرآة للعرض والفرز السريع (SRS-F06-04) + فحص كاش الـ 24 ساعة (SRS-AI-C01).
- واجهة المقارنة تعرض **آخر 5 تقييمات `completed`** فقط؛ الفاشلة (`failed`) والجزئية (`partial`) محفوظة للتدقيق ولا تحتسب ضمن الخمسة.
- `partial` (اكتملت 3 من 5 أبعاد ضمن سقف 180 ثانية) تُعرض كـ `completed` مع تحذيراتها.

---

## 7. ملاحظات تصميم إضافية

- `users.password` **nullable** لتمكين حسابات OAuth-only (Socialite — SRS-F01-07).
- `projects.status` (حالة المشروع التجارية) منفصل عن `publication_status` (نشر/مسودة/أرشيف) — توافقاً مع `docs/api/enums.md` §1.2-1.3.
- `projects.view_count` تتزايد عند كل زيارة لصفحة التفاصيل — تُستخدم في الفرز (SRS-F06-04).
- البحث النصي الكامل يتم عبر **Meilisearch/Scout** وليس MySQL FTS — لا فهارس FULLTEXT في MVP.
- جداول إطار Laravel التلقائية (`personal_access_tokens` لـ Sanctum، `jobs`/`failed_jobs` لـ Horizon، `cache`/`sessions`) تنشأ من الإطار وليست ضمن الجداول العشرة.
- جدول `agreements` المستقبلي (v2.0 مع DocuSign) سينشق من `interests.agreement_pdf_path` دون كسر البنية.
