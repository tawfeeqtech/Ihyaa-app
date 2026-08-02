# Migrations — قاعدة بيانات منصة إحياء (Ihyaa)

**الإصدار:** 1.0 · **التاريخ:** 2026-08-02
**الإطار:** Laravel 13 + PHP 8.3 · **القاعدة:** MySQL 8 (InnoDB, utf8mb4)
**المرجع:** `docs/database/er-diagram.md` (المخطط المعتمد) · `requirements/srs-mvp-v3.md` §5.4.4

---

## 0. مبادئ واتفاقيات

1. **الترتيب إلزامي:** `roles` و`categories` قبل `users` (FK)، و`users` قبل `projects`، ثم بقية الجداول.
2. أسماء الملفات بتنسيق `YYYY_MM_DD_HHMMSS_...` — استخدم `php artisan make:migration create_<table>_table` ويبقى اسم الكلاس كما هو هنا.
3. `$table->enum()` خاص بـ MySQL — مقبول لأن المشروع MySQL فقط (قرار معتمد، لا PostgreSQL).
4. الترميز: `utf8mb4_unicode_ci` (افتراضي Laravel) — يغطي العربية كاملة.
5. القيود `CHECK` تُطبَّق فعلياً في MySQL 8.0.16+.
6. أسماء الـ FKs باتباع Laravel: `constrained('roles')` يستنتج `roles.id`.
7. جدولا Sanctum (`personal_access_tokens`) وHorizon (`jobs`, `failed_jobs`, `cache`) ينشئهما الإطار — خارج هذه الوثيقة.
8. **`password_resets` بدل `password_reset_tokens`:** لتشغيل الجدول بالاسم المعتمد هنا، اضبط في `.env`:
   `AUTH_PASSWORD_RESET_TOKEN_TABLE=password_resets` (أو عدّل `config('auth.passwords.users.table')`).

---

## 1. `create_roles_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();        // idea_owner | investor | admin
            $table->string('display_name', 50);          // صاحب فكرة | مستثمر | مشرف
            $table->string('description', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
```

**ملاحظات:** 3 صفوف فقط تُزرع عبر `RoleSeeder` · `admin` لا يُنشأ بالتسجيل العام (SRS §1.2) · فهرس فريد على `name`.

---

## 2. `create_categories_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name_ar', 100);                      // الاسم بالعربية
            $table->string('name_en', 100);                      // الاسم بالإنجليزية
            $table->string('slug', 120)->unique();               // ecommerce | edtech | ai ...
            $table->string('icon', 50)->nullable();              // اسم أيقونة Phosphor
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
```

**ملاحظات:** 15 تصنيفاً عبر `CategorySeeder` · تصنيفات مسطحة (بلا أب/ابن) — النموذج قائمة منسدلة واحدة (SRS-F02-01) · `restrictOnDelete` على مستوى المشاريع (لا حذف لتصنيف مستخدم).

---

## 3. `create_users_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();

            // ——— الهوية والمصادقة ———
            $table->string('name', 100);
            $table->string('email', 190)->unique();
            $table->string('password')->nullable();          // nullable: حسابات OAuth فقط
            $table->timestamp('email_verified_at')->nullable(); // التفعيل إلزامي (SRS-F01-02)
            $table->rememberToken();
            $table->boolean('is_active')->default(true);

            // ——— OAuth (Google / GitHub / LinkedIn — SRS-F01-07) ———
            $table->string('provider', 30)->nullable();      // google | github | linkedin
            $table->string('provider_id', 190)->nullable();

            // ——— التحقق بالبريد OTP (6 أرقام — صلاحية دقيقة واحدة) ———
            $table->char('otp_code', 6)->nullable();         // 6 أرقام — التحقق من الصيغة على مستوى الطلب
            $table->timestamp('otp_expires_at')->nullable(); // now() + 60 ثانية
            $table->unsignedTinyInteger('otp_attempts')->default(0); // حظر بعد 3 محاولات خاطئة
            $table->timestamp('otp_last_sent_at')->nullable();      // حد الإعادة: 3/دقيقة (rate limit)

            // ——— الملف الشخصي — حقول مشتركة ———
            $table->string('avatar_path', 255)->nullable();
            $table->text('bio')->nullable();

            // ——— ملف صاحب الفكرة (idea_owner) ———
            $table->string('university', 190)->nullable();
            $table->string('major', 190)->nullable();

            // ——— ملف المستثمر (investor) ———
            $table->string('investment_focus', 190)->nullable();
            $table->json('investment_range')->nullable();    // {"min": 50000, "max": 500000}
            $table->json('preferred_sectors')->nullable();   // ["التقنية المالية", "الذكاء الاصطناعي"]

            $table->timestamp('last_login_at')->nullable();  // تحليلات النشاط — آخر 7 أيام (SRS-F12-02)
            $table->timestamps();

            // حساب OAuth واحد لكل مزود
            $table->unique(['provider', 'provider_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

**ملاحظات:**
- `otp_code` يُخزَّن كما هو (لا hash) لكونه قصير العمر — يُصرف فور الاستهلاك (set null) بعد النجاح.
- `provider/provider_id` فريدان كمركّب؛ قيم `NULL` لا تتعارض في MySQL (مؤشر فريد متعدد القيم).
- في `User` Model أضف: `protected $casts = ['investment_range' => 'array', 'preferred_sectors' => 'array', 'is_active' => 'boolean'];`
- نموذج التحقق من OTP (Rule على مستوى التطبيق):
  ```php
  'otp_code' => ['required', 'string', 'size:6', 'regex:/^[0-9]{6}$/'],
  ```

---

## 4. `create_password_resets_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_resets', function (Blueprint $table) {
            $table->string('email', 190)->index();
            $table->string('token', 64);                     // يُخزن hash (Str::random + Hash)
            $table->timestamp('created_at')->nullable();     // الصلاحية: ساعة واحدة (تحقق على مستوى التطبيق)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_resets');
    }
};
```

**ملاحظات:** جدول أدوات بلا FK عمداً (لا يمنع حذف المستخدم) · صلاحية الرابط ساعة واحدة (SRS-F01-04) بفحص `created_at > now()->subHour()` · اضبط `AUTH_PASSWORD_RESET_TOKEN_TABLE=password_resets` في `.env`.

---

## 5. `create_projects_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();

            $table->string('title', 190);
            $table->text('description');                     // 50–2000 حرف — تحقق على مستوى الطلب

            // حالة المشروع التجارية (SRS-F02-01) — تظهر على البطاقة
            $table->enum('status', ['completed', 'needs_development', 'needs_funding'])
                ->default('needs_funding');

            // حالة النشر/العرض — منفصلة عن status (docs/api/enums.md §1.2-1.3)
            $table->enum('publication_status', ['draft', 'published', 'archived'])
                ->default('published');

            $table->json('tags')->nullable();                // حتى 10 وسوم تقنيات
            $table->string('github_url', 255)->nullable();
            $table->string('video_url', 255)->nullable();    // YouTube / Vimeo فقط
            $table->enum('video_provider', ['youtube', 'vimeo'])->nullable();

            $table->decimal('budget_min', 12, 2)->nullable();
            $table->decimal('budget_max', 12, 2)->nullable();

            // مستوى الإفصاح عن تقرير AI: 1 زائر | 2 مسجل | 3 بعد الاتفاق (الافتراضي)
            $table->unsignedTinyInteger('visibility_level')->default(3);

            // مرآة لآخر تقييم مكتمل — للعرض والفرز السريع (SRS-F06-04)
            $table->decimal('ai_score', 5, 2)->nullable();   // 0.00–100.00
            $table->unsignedBigInteger('view_count')->default(0); // الفرز حسب المشاهدات
            $table->timestamp('last_evaluation_at')->nullable();  // كاش الـ 24 ساعة (SRS-AI-C01)

            $table->timestamps();
            $table->softDeletes();                           // سلة مهملات 30 يوماً (SRS-F02-06)

            // ——— الفهارس ———
            $table->index(['user_id', 'deleted_at']);        // مشاريع المالك + سلة المهملات
            $table->index(['category_id', 'deleted_at']);    // فلترة التصنيف
            $table->index(['status', 'ai_score']);           // الفرز حسب التقييم
            $table->index(['status', 'created_at']);         // الفرز حسب الأحدث
            $table->index(['status', 'view_count']);         // الفرز حسب المشاهدات
            $table->index(['publication_status', 'deleted_at']); // معرض المشاريع المنشورة

            // ——— قيود CHECK ———
            $table->check('visibility_level BETWEEN 1 AND 3');
            $table->check('budget_min IS NULL OR budget_min >= 0');
            $table->check('budget_max IS NULL OR budget_min IS NULL OR budget_max >= budget_min');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
```

**ملاحظات:**
- **Soft delete:** `deleted_at` = سلة المهملات؛ مدة الاسترجاع 30 يوماً؛ الحذف النهائي عبر أمر مجدول يومي (`projects:purge-trash`) يفحص `deleted_at < now()->subDays(30)` ويحذف نهائياً مع ملفاته من Local Disk.
- الفهارس المركّبة تبدأ بـ `deleted_at` تُخدم كل استعلامات العرض (`WHERE deleted_at IS NULL`) — ليست ضرورية في كل فهرس لأن MySQL يستخدمها كمرشّح مساعد، والمجموعة أعلاه كافية لحجم MVP (50–1,000 مشروع).
- **التحقق من الفيديو** (Rule على مستوى الطلب — SRS-F02-03):
  ```php
  'video_url' => ['nullable', 'url', 'regex:/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+$/i'],
  'video_provider' => ['required_with:video_url', Rule::in(['youtube', 'vimeo'])],
  ```
- **حقول جوهرية تطلب إعادة التقييم (SRS-F04-02):** التغيير في `description`، `tags`، `github_url`، `status` — يقترح إعادة تقييم يدوية بتأكيد المستخدم (لا تلقائية).

---

## 6. `create_project_files_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();

            $table->enum('type', ['image', 'pdf', 'document'])->default('image');
            $table->string('file_path', 255);            // مسار داخل storage/app/public
            $table->string('original_name', 255);        // الاسم الأصلي للعرض فقط
            $table->string('mime_type', 100);            // MIME حقيقي (SRS-NFR-08)
            $table->unsignedBigInteger('file_size');     // بالبايت
            $table->boolean('is_cover')->default(false); // صورة الغلاف في بطاقة المعرض
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['project_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_files');
    }
};
```

**ملاحظات:**
- **الحدود (SRS-F02-02):** 5 صور × 5MB + 3 ملفات PDF × 10MB — تُفرض بالتحقق على مستوى الطلب (لا يمكن فرضها بقاعدة البيانات):
  ```php
  'images' => ['nullable', 'array', 'max:5'],
  'images.*' => ['image', 'mimes:jpeg,png,webp', 'max:5120'],   // 5MB بالكيلوبايت
  'pdfs' => ['nullable', 'array', 'max:3'],
  'pdfs.*' => ['file', 'mimes:pdf', 'max:10240'],               // 10MB
  ```
- التخزين Local Disk فقط: `Storage::disk('public')->putFile('projects/' . $project->id, $file)` — واسم الملف الناتج عشوائي (hash) بلا مساهمة المستخدم (حماية المسار — SRS-NFR-08).
- `is_cover` يُدار في التطبيق: أول صورة تُرفع تصبح الغلاف افتراضياً، ويمكن تبديلها.

---

## 7. `create_ai_evaluations_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();

            // يتزايد تلقائياً لكل محاولة تقييم (بما فيها إعادة المحاولة بعد الفشل)
            $table->unsignedInteger('version')->default(1);
            $table->enum('status', ['processing', 'completed', 'failed', 'partial'])
                ->default('processing');

            $table->decimal('overall_score', 5, 2)->nullable();   // 0.00–100.00
            $table->json('scores')->nullable();          // 5 أبعاد + معايير فرعية (مخطط SRS §5.4.6.3)
            $table->json('gap_analysis')->nullable();    // technical | market | team | documentation
            $table->json('recommendations')->nullable(); // immediate | short_term | long_term
            $table->json('required_skills')->nullable(); // مهارات مطلوبة
            $table->decimal('confidence_score', 5, 2)->nullable();
            $table->json('warnings')->nullable();        // تحذيرات (نقص بيانات…)
            $table->enum('model_used', ['openai', 'claude'])->nullable(); // Fallback (SRS-F03-03)
            $table->unsignedInteger('processing_time_ms')->nullable();   // هدف P95: 120s — سقف 180s
            $table->text('error_message')->nullable();   // سجل التدقيق (SRS-F03-05)
            $table->timestamps();

            // سجل كامل — لا حذف تلقائي (SRS-DB-05)
            $table->unique(['project_id', 'version']);
            $table->index(['project_id', 'status', 'created_at']); // آخر 5 مكتملة للمقارنة
            $table->index('status');                             // عدادات لوحة المشرف
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_evaluations');
    }
};
```

**ملاحظات:**
- حساب `version` عند الإنشاء:
  ```php
  $version = AiEvaluation::where('project_id', $project->id)->max('version') + 1;
  ```
  (الـ Queue يضمن التسلسل لكل مشروع — `ShouldBeUnique` على الـ Job يمنع تقييمين متزامنين لنفس المشروع.)
- عند اكتمال تقييم: `Project::whereKey($id)->update(['ai_score' => $e->overall_score, 'last_evaluation_at' => now()])` — ثم بث `evaluation.completed` عبر Reverb وإشعار `evaluation_completed`.
- `failed` و`partial` محفوظان للتدقيق (متاحان للمشرف فقط) — لا يحتسبان ضمن آخر 5 ظاهرة.
- بنية `scores` JSON تتبع مخطط SRS §5.4.6.3 حرفياً (5 أبعاد: technical_quality, innovation, market_viability, team_completeness, documentation بمعاييرها الفرعية).

---

## 8. `create_interests_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('investor_id')->constrained('users')->cascadeOnDelete();

            $table->enum('interest_type', ['investment', 'technical_development', 'consultation'])
                ->default('investment');
            $table->string('message', 500)->nullable();  // اختياري — حد 500 حرف

            $table->enum('status', ['pending', 'accepted', 'rejected', 'cancelled'])
                ->default('pending');
            $table->string('rejection_reason', 255)->nullable();
            $table->string('agreement_pdf_path', 255)->nullable(); // مستند الاتفاق الثابت — Local Disk
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();

            // ——— الفهارس ———
            $table->index(['project_id', 'status']);     // لوحة طلبات صاحب الفكرة + الفلاتر
            $table->index(['investor_id', 'status']);    // طلبات المستثمر المرسلة
            $table->index('created_at');                 // الترتيب الزمني

            // ——— منع الطلب النشط المكرر (SRS-F08-03) ———
            // عمود مولّد: investor_id فقط للطلبات النشطة (pending/accepted)، NULL خلاف ذلك
            // → المؤشر الفريد يمنع تكرار الطلب النشط، وقيم NULL لا تتعارض
            //   فيُسمح بإعادة الإرسال بعد الرفض أو الإلغاء (UC-06 E1).
            $table->unsignedBigInteger('active_key')
                ->storedAs("CASE WHEN status IN ('pending', 'accepted') THEN investor_id ELSE NULL END");
            $table->unique(['project_id', 'active_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interests');
    }
};
```

**ملاحظات:**
- **آلة الحالات:** `pending` → `accepted` (إنشاء PDF + كشف البريد المتبادل — UC-07) · `pending` → `rejected` (سبب اختياري) · `pending` → `cancelled` (المستثمر) · `accepted` → `cancelled` (المستثمر — يُحذف ملف PDF ويُخفى البريد، UC-07 E2).
- **مستند الاتفاق (SRS-F08-05):** PDF ثابت بأسماء الطرفين يُنشأ عند القبول خلال < 5 ثوانٍ ويُحفظ في `storage/app/public/agreements/` — المسار في `agreement_pdf_path`. عند الإلغاء بعد القبول: حذف الملف و`agreement_pdf_path = null`.
- عند الرفض: قبول/رفض طلب `cancelled` → خطأ `409 INTEREST_CANCELLED` (UC-06 E3).
- `active_key` عمود مولّد `STORED` — لا يُرسل في الإدخال ولا يظهر في `$fillable`؛ ينشئه MySQL تلقائياً.
- في `Interest` Model أضف: `protected $casts = ['status' => InterestStatus::class]` عند اعتماد الـ Enums.

---

## 9. `create_saved_projects_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();     // مستثمر
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'project_id']); // حفظ واحد فقط لكل مستثمر/مشروع (SRS-F11-04)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_projects');
    }
};
```

**ملاحظات:** لا `notes` (حُذف — لا واجهة للتدوين في MVP، SRS-F01-08) · زر الحفظ/الإزالة بنقرة واحدة (SRS-API-33/34).

---

## 10. `create_notifications_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('type', 100);      // interest_received | evaluation_completed | ...
            $table->string('title', 190);     // نص عربي جاهز للعرض
            $table->text('body')->nullable();
            $table->json('data')->nullable(); // {"project_id": 1, "interest_id": 5, "url": "/projects/1"}
            $table->boolean('is_critical')->default(false); // true → بث فوري عبر Reverb
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']); // جرس الإشعارات: آخر 5 + العدادات
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
```

**ملاحظات — أنواع الإشعارات المعتمدة (enums.md §2.9):**

| `type` | `is_critical` | الوجهة | البث |
|--------|:---:|--------|------|
| `interest_received` | true | صاحب الفكرة | Reverb فوري (حدث حرج) |
| `evaluation_completed` | true | صاحب الفكرة | Reverb فوري (حدث حرج) |
| `interest_accepted` | false | المستثمر | عند إعادة التحميل |
| `interest_rejected` | false | المستثمر | عند إعادة التحميل |
| `interest_cancelled` | false | صاحب الفكرة | عند إعادة التحميل |
| `project_updated` | false | المتفاعلون (محفوظ/مرسل طلب) | عند إعادة التحميل |
| `evaluation_failed` | false | المشرف (تنبيه SRS-AI-F04) | عند إعادة التحميل |

قناة Reverb: `private-users.{user_id}` · زمن الوصول للأحداث الحرجة < 5 ثوانٍ (SRS-F09-02) · لا إشعارات بريد إلكتروني في MVP (SRS-F09-04 خارج النطاق).

---

## 11. جدول الملخص النهائي

| # | الملف | الجدول | FKs | Unique | فهارس رئيسية | خاص |
|---|-------|--------|-----|--------|--------------|-----|
| 1 | `..._create_roles_table` | roles | — | name | — | 3 صفوف seeder |
| 2 | `..._create_categories_table` | categories | — | slug | — | 15 تصنيفاً seeder |
| 3 | `..._create_users_table` | users | role_id | email · (provider, provider_id) | role_id | OTP 6 أرقام/دقيقة · OAuth · ملف حسب الدور |
| 4 | `..._create_password_resets_table` | password_resets | — | — | email | صلاحية ساعة |
| 5 | `..._create_projects_table` | projects | user_id · category_id | — | (user_id, deleted_at) (category_id, deleted_at) (status, ai_score) (status, created_at) (status, view_count) (publication_status, deleted_at) | softDeletes 30 يوماً · CHECK visibility/budget |
| 6 | `..._create_project_files_table` | project_files | project_id | — | (project_id, type) | صور 5×5MB · PDF 3×10MB (طبقة التحقق) |
| 7 | `..._create_ai_evaluations_table` | ai_evaluations | project_id | (project_id, version) | (project_id, status, created_at) · status | JSON 5 أبعاد · Fallback openai/claude |
| 8 | `..._create_interests_table` | interests | project_id · investor_id | (project_id, active_key) — عمود مولّد | (project_id, status) (investor_id, status) created_at | آلة حالات 4 · PDF الاتفاق |
| 9 | `..._create_saved_projects_table` | saved_projects | user_id · project_id | (user_id, project_id) | — | بلا notes |
| 10 | `..._create_notifications_table` | notifications | user_id | — | (user_id, read_at) created_at | is_critical → Reverb |

---

## 12. القواعد التشغيلية (تُنفَّذ في التطبيق — لا في DB)

| القاعدة | القيمة | المصدر |
|--------|--------|--------|
| صلاحية OTP | 60 ثانية — حد الإدخال 3 محاولات، حد الإعادة 3/دقيقة | SRS-F01-02 · rate-limiting |
| صلاحية رابط إعادة التعيين | ساعة واحدة (`created_at`) | SRS-F01-04 |
| كاش إعادة التقييم | 24 ساعة بين تقييمين (`last_evaluation_at`) | SRS-AI-C01 |
| سلة المهملات | استرجاع خلال 30 يوماً — حذف نهائي تلقائي بعدها (أمر مجدول يومي) | SRS-F02-06 |
| عرض المقارنة | آخر 5 تقييمات `completed` فقط | SRS-DB-05 |
| الفرز في المعرض | `ai_score` · `created_at` · `view_count` (تصاعدي/تنازلي) | SRS-F06-04 |
| حجم الصفحة | 12 مشروعاً | SRS-F07-05 |
