# قائمة المسارات — منصة إحياء (Ihyaa)
## Laravel Route Definitions — routes/api.php

**المرجع:** SRS-API-01..49 + `rate-limiting-spec.md` §6 (استراتيجية التنفيذ)
**Framework:** Laravel 13 · PHP 8.3 · Sanctum · Redis (Rate Limiter)

---

## 1. البنية العامة (Structure)

```
routes/
  api.php                        ← هذا الملف (كل المسارات + Middleware)
app/
  Http/
    Controllers/Api/             ← AuthController, ProfileController, ProjectController,
                                   FileController, EvaluationController, ReportController,
                                   SearchController, TagController, InterestController,
                                   AgreementController, NotificationController,
                                   SavedProjectController, TrashController,
                                   DashboardController, AdminController, AIAgentController,
                                   HealthController
    Middleware/
      EnsureRole.php             ← alias: role — تحقق الدور (idea_owner|investor|admin)
  Policies/                      ← ProjectPolicy (owner), InterestPolicy, AgreementPolicy,
                                   EvaluationPolicy (الإفصاح 1/2/3)
  Providers/
    AppServiceProvider.php       ← جميع Named Rate Limiters (القسم 3)
config/
  cache.php                      ← CACHE_DRIVER=redis (العدادات في Redis فقط — لا جدول rate_limits)
.env                             ← CACHE_DRIVER=redis, REDIS_HOST=..., FILESYSTEM_DISK=public
```

---

## 2. `routes/api.php` — التعريفات الكاملة

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AdminController,
    AgreementController,
    AIAgentController,
    AuthController,
    DashboardController,
    EvaluationController,
    FileController,
    HealthController,
    InterestController,
    NotificationController,
    ProfileController,
    ProjectController,
    ReportController,
    SavedProjectController,
    SearchController,
    TagController,
    TrashController,
};

/*
|--------------------------------------------------------------------------
| L7 — Health & Meta (بدون Rate Limit — IP داخلي فقط في الإنتاج)
|--------------------------------------------------------------------------
*/
Route::get('/health', [HealthController::class, 'index']);
Route::get('/ready', [HealthController::class, 'ready']);

/*
|--------------------------------------------------------------------------
| L1 — المصادقة (Public — حدود صارمة)
| SRS-API-01..08
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:auth.register');                          // RL-AUTH-01 · 3/دقيقة · IP

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:auth.login');                             // RL-AUTH-02 · 5/دقيقة · email

Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('throttle:auth.forgot-password');                   // RL-AUTH-05 · 2/دقيقة · email

Route::post('/reset-password', [AuthController::class, 'resetPassword'])
    ->middleware('throttle:auth.reset-password');                    // RL-AUTH-06 · 2/دقيقة · email

Route::get('/auth/{provider}', [AuthController::class, 'redirectToProvider'])
    ->whereIn('provider', ['google', 'github', 'linkedin'])
    ->middleware('throttle:auth.oauth');                             // RL-AUTH-07 · 5/دقيقة · IP

Route::post('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback'])
    ->whereIn('provider', ['google', 'github', 'linkedin'])
    ->middleware('throttle:auth.oauth');                             // RL-AUTH-08 · 5/دقيقة · IP

/*
|--------------------------------------------------------------------------
| L2 — التصفح العام (Public — IP)
| SRS-API-13, 14, 20, 21, 12, 49
|--------------------------------------------------------------------------
*/
Route::get('/projects', [ProjectController::class, 'index'])
    ->middleware('throttle:public.browse');                          // RL-PUB-01 · 30/دقيقة · burst 10

Route::get('/projects/{project}', [ProjectController::class, 'show'])
    ->middleware('throttle:public.detail');                          // RL-PUB-02 · 60/دقيقة · burst 15 (مخزّن مؤقتاً)

Route::get('/search', [SearchController::class, 'search'])
    ->middleware('throttle:public.browse');                          // RL-PUB-03 · 30/دقيقة

Route::get('/search/suggestions', [SearchController::class, 'suggestions'])
    ->middleware('throttle:public.browse');                          // RL-PUB-04 · 30/دقيقة

Route::get('/tags/suggestions', [TagController::class, 'suggestions'])
    ->middleware('throttle:public.browse');                          // SRS-API-49 · L2 · 30/دقيقة

Route::get('/profile/{user}', [ProfileController::class, 'showPublic'])
    ->middleware('throttle:public.browse');                          // RL-PUB-05 · 30/دقيقة

/*
|--------------------------------------------------------------------------
| المصادق عليهم — Sanctum (جميع المسارات التالية)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    /*
    | L1 — استكمال المصادقة (مصادق)
    |------------------------------------------------------------------------
    */
    Route::post('/logout', [AuthController::class, 'logout'])
        ->middleware('throttle:auth.logout');                        // RL-AUTH-03 · 10/دقيقة · user_id

    Route::post('/email/verify', [AuthController::class, 'verifyEmail'])
        ->middleware('throttle:auth.email-verify');                  // RL-AUTH-04 · 3/دقيقة · user_id
    // Body: {email, code?} — code غائب = إعادة إرسال رمز جديد (UC-01 A2)

    /*
    | L3/L4 — الملف الشخصي (Shared — read حسب الدور)
    | SRS-API-09..11
    |------------------------------------------------------------------------
    */
    Route::get('/profile', [ProfileController::class, 'show'])
        ->middleware('throttle:shared.read');                        // RL-IO-01 / RL-INV-01 · 60/120/دقيقة

    Route::put('/profile', [ProfileController::class, 'update'])
        ->middleware('throttle:shared.write');                       // RL-IO-02 / RL-INV-02 · 10/دقيقة
    // يُسمح بحقل role فقط عندما role=null (أول دخول OAuth — SRS-F01-07)

    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar'])
        ->middleware('throttle:upload.file');                        // RL-IO-03 / RL-INV-03 · L5 · 10/دقيقة

    /*
    | L3-W — إدارة المشاريع (Idea Owner — Policy داخلية للتحقق من الملكية)
    | SRS-API-15..17
    |------------------------------------------------------------------------
    */
    Route::middleware('role:idea-owner')->group(function () {

        Route::post('/projects', [ProjectController::class, 'store'])
            ->middleware('throttle:idea-owner.write');               // RL-IO-04 · 10/دقيقة

        Route::put('/projects/{project}', [ProjectController::class, 'update'])
            ->middleware('throttle:idea-owner.write');               // RL-IO-05 · 10/دقيقة

        Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])
            ->middleware('throttle:idea-owner.write');               // RL-IO-06 · 10/دقيقة

        // امتداد مقترح (خارج الـ 49): DELETE /projects/{project}/files/{file}
        // → Route::delete('/projects/{project}/files/{file}', [FileController::class, 'destroy'])
        //   ->middleware('throttle:idea-owner.write');

        /*
        | L5 — رفع الملفات (Idea Owner — مالك المشروع)
        | SRS-API-18
        |----------------------------------------------------------------------
        */
        Route::post('/projects/{project}/files', [FileController::class, 'upload'])
            ->middleware('throttle:upload.file');                    // RL-IO-07 · L5 · 10/دقيقة

        /*
        | L5 — التقييم وإعادة التقييم (Idea Owner — مالك المشروع)
        | SRS-API-44..47 · 3/دقيقة لكل (user_id + project_id) + Cache 24 ساعة
        |----------------------------------------------------------------------
        */
        Route::post('/projects/{project}/evaluate', [EvaluationController::class, 'evaluate'])
            ->middleware('throttle:ai.evaluate');

        Route::post('/projects/{project}/re-evaluate', [EvaluationController::class, 'reEvaluate'])
            ->middleware('throttle:ai.evaluate');

        Route::post('/projects/{project}/evaluations/{evaluation}/retry',
            [EvaluationController::class, 'retry'])
            ->middleware('throttle:ai.evaluate');

        Route::get('/projects/{project}/evaluation-status',
            [EvaluationController::class, 'status'])
            ->middleware('throttle:shared.read');

        /*
        | L3 — سلة المهملات (Idea Owner)
        | SRS-API-35..37
        |----------------------------------------------------------------------
        */
        Route::get('/trashed-projects', [TrashController::class, 'index'])
            ->middleware('throttle:shared.read');                    // RL-IO-10 · 20/دقيقة

        Route::post('/trashed-projects/{project}/restore', [TrashController::class, 'restore'])
            ->middleware('throttle:shared.write');                   // RL-IO-11 · 10/دقيقة

        Route::delete('/trashed-projects/{project}/force', [TrashController::class, 'forceDelete'])
            ->middleware('throttle:shared.write');                   // RL-IO-12 · 10/دقيقة

        /*
        | L5 — وكيل AI: تحليل المشاريع (Idea Owner — مالك المشروع)
        | SRS-API-42..43
        |----------------------------------------------------------------------
        */
        Route::post('/ai/analyze/{project}', [AIAgentController::class, 'analyze'])
            ->middleware('throttle:ai.analyze');                     // RL-AI-01 · 3/دقيقة · user+project

        Route::get('/ai/analysis/{artifact}', [AIAgentController::class, 'show'])
            ->middleware('throttle:ai.report');                      // RL-AI-02 · 10/دقيقة

        /*
        | L5 — تصدير تقرير التقييم PDF (Owner دائماً / Investor بعد الاتفاق)
        | SRS-API-48
        |----------------------------------------------------------------------
        */
        Route::get('/projects/{project}/evaluations/{evaluation}/report',
            [ReportController::class, 'export'])
            ->middleware('throttle:ai.report');
    });

    /*
    | L4-W — الاهتمام والمحفوظات (Investor)
    | SRS-API-22, 33, 34
    |------------------------------------------------------------------------
    */
    Route::middleware('role:investor')->group(function () {

        Route::post('/projects/{project}/interest', [InterestController::class, 'store'])
            ->middleware('throttle:investor.write');                 // RL-INV-04 · 10/دقيقة

        Route::post('/projects/{project}/save', [SavedProjectController::class, 'save'])
            ->middleware('throttle:investor.write');                 // RL-INV-07 · 10/دقيقة

        Route::delete('/projects/{project}/save', [SavedProjectController::class, 'unsave'])
            ->middleware('throttle:investor.write');                 // RL-INV-08 · 10/دقيقة

        Route::get('/saved-projects', [SavedProjectController::class, 'index'])
            ->middleware('throttle:shared.read');                    // RL-INV-06 · 60/دقيقة
    });

    /*
    | L3/L4 — نقاط مشتركة (Shared — role policies داخلية)
    | SRS-API-19, 23..27, 28..31
    |------------------------------------------------------------------------
    */
    Route::get('/projects/{project}/evaluations', [ProjectController::class, 'evaluations'])
        ->middleware('throttle:shared.read');                        // RL-IO-08 · 30/دقيقة

    Route::get('/interests/received', [InterestController::class, 'received'])
        ->middleware('throttle:shared.read');                        // RL-SH-01 · L3 · 30/دقيقة (IO)

    Route::get('/interests/sent', [InterestController::class, 'sent'])
        ->middleware('throttle:shared.read');                        // RL-INV-05 · 60/دقيقة (Investor)

    Route::put('/interests/{interest}/accept', [InterestController::class, 'accept'])
        ->middleware('throttle:shared.write');                       // RL-SH-02 · 10/دقيقة (IO — مالك المشروع)

    Route::put('/interests/{interest}/reject', [InterestController::class, 'reject'])
        ->middleware('throttle:shared.write');                       // RL-SH-03 · 10/دقيقة (IO — مالك المشروع)

    Route::get('/agreements/{agreement}', [AgreementController::class, 'show'])
        ->middleware('throttle:shared.read');                        // RL-SH-04 · 10/دقيقة (الطرفان)

    Route::get('/notifications', [NotificationController::class, 'index'])
        ->middleware('throttle:shared.read');                        // RL-SH-05 · 30/دقيقة

    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markRead'])
        ->middleware('throttle:shared.read');                        // RL-SH-06 · 30/دقيقة

    Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead'])
        ->middleware('throttle:shared.write');                       // RL-SH-07 · 10/دقيقة

    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])
        ->middleware('throttle:shared.read');                        // RL-SH-08 · 30/دقيقة

    /*
    | L3/L4 — لوحات التحكم (Dashboard — 20/دقيقة)
    | SRS-API-38..39
    |------------------------------------------------------------------------
    */
    Route::get('/dashboard/idea-owner', [DashboardController::class, 'ideaOwner'])
        ->middleware('role:idea-owner')
        ->middleware('throttle:dashboard');                          // RL-IO-09 · 20/دقيقة

    Route::get('/dashboard/investor', [DashboardController::class, 'investor'])
        ->middleware('role:investor')
        ->middleware('throttle:dashboard');                          // RL-INV-09 · 20/دقيقة

    /*
    | L6 — المشرف (Admin — seeder فقط)
    | SRS-API-40..41
    |------------------------------------------------------------------------
    */
    Route::middleware('role:admin')->group(function () {

        Route::get('/admin/analytics', [AdminController::class, 'analytics'])
            ->middleware('throttle:admin.read');                     // RL-ADM-01 · 60/دقيقة

        Route::get('/admin/analytics/export', [AdminController::class, 'export'])
            ->middleware('throttle:admin.export');                   // RL-ADM-02 · 10/دقيقة
    });
});
```

---

## 3. `AppServiceProvider.php` — Named Rate Limiters

```php
<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    protected function configureRateLimiting(): void
    {
        // ------------------------------------------------
        // L1 — المصادقة (rate-limiting-spec §3.1)
        // ------------------------------------------------
        RateLimiter::for('auth.register', fn (Request $request) =>
            Limit::perMinute(3)->by($request->ip()));

        RateLimiter::for('auth.login', fn (Request $request) =>
            Limit::perMinute(5)->by($request->input('email') ?: $request->ip()));

        RateLimiter::for('auth.logout', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('auth.email-verify', fn (Request $request) =>
            Limit::perMinute(3)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('auth.forgot-password', fn (Request $request) =>
            Limit::perMinute(2)->by($request->input('email') ?: $request->ip()));

        RateLimiter::for('auth.reset-password', fn (Request $request) =>
            Limit::perMinute(2)->by($request->input('email') ?: $request->ip()));

        RateLimiter::for('auth.oauth', fn (Request $request) =>
            Limit::perMinute(5)->by($request->ip()));

        // ------------------------------------------------
        // L2 — التصفح العام (IP)
        // ------------------------------------------------
        RateLimiter::for('public.browse', fn (Request $request) =>
            Limit::perMinute(30)->by($request->ip()));

        RateLimiter::for('public.detail', fn (Request $request) =>
            Limit::perMinute(60)->by($request->ip()));

        // ------------------------------------------------
        // L3 — صاحب فكرة
        // ------------------------------------------------
        RateLimiter::for('idea-owner.read', fn (Request $request) =>
            Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('idea-owner.write', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));

        // ------------------------------------------------
        // L4 — مستثمر
        // ------------------------------------------------
        RateLimiter::for('investor.read', fn (Request $request) =>
            Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('investor.write', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));

        // ------------------------------------------------
        // L5 — العمليات المكلفة (AI + رفع)
        // ------------------------------------------------
        RateLimiter::for('ai.analyze', fn (Request $request) =>
            Limit::perMinute(3)->by($request->user()?->id . ':' . $request->route('project')));

        // SRS-API-44..46: تقييم / إعادة تقييم / إعادة محاولة — 3/دقيقة لكل (مستخدم + مشروع)
        RateLimiter::for('ai.evaluate', fn (Request $request) =>
            Limit::perMinute(3)->by($request->user()?->id . ':' . $request->route('project')));

        // SRS-API-43, 48: عرض التحليل / تصدير تقرير PDF
        RateLimiter::for('ai.report', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('upload.file', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));

        // ------------------------------------------------
        // L6 — مشرف
        // ------------------------------------------------
        RateLimiter::for('admin.read', fn (Request $request) =>
            Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('admin.export', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));

        // ------------------------------------------------
        // L3+L4 — نقاط مشتركة (الحد حسب دور المستخدم)
        // ------------------------------------------------
        RateLimiter::for('shared.read', function (Request $request) {
            $user = $request->user();
            $limit = $user && $user->role === 'investor' ? 120 : 60;
            return Limit::perMinute($limit)->by($user?->id ?: $request->ip());
        });

        RateLimiter::for('shared.write', fn (Request $request) =>
            Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('dashboard', fn (Request $request) =>
            Limit::perMinute(20)->by($request->user()?->id ?: $request->ip()));
    }
}
```

---

## 4. `EnsureRole` Middleware (alias: `role`)

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            return response()->json([
                'code'    => 'FORBIDDEN',
                'message' => 'ليس لديك صلاحية الوصول إلى هذه الصفحة',
                'errors'  => null,
            ], 403);
        }

        return $next($request);
    }
}
```

**التسجيل:** في `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\EnsureRole::class,
    ]);
})
```

---

## 5. سياسات الملكية (Policies)

| الـ Policy | القاعدة | النتيجة عند المخالفة |
|-----------|--------|---------------------|
| `ProjectPolicy::update/destroy` | `user->id === project->user_id` | `403 FORBIDDEN` |
| `ProjectPolicy::view` | مصفوفة الإفصاح (visibility_level 1/2/3) | تُخفى الحقول، لا خطأ |
| `EvaluationPolicy::view` | Owner أو Investor بعد اتفاق `accepted` | `403 FORBIDDEN` |
| `EvaluationPolicy::export` | Owner دائماً / Investor بعد اتفاق | `403 FORBIDDEN` |
| `InterestPolicy::accept/reject` | صاحب المشروع فقط | `403 FORBIDDEN` |
| `AgreementPolicy::view` | `user->id` في (idea_owner_id, investor_id) | `403 FORBIDDEN` |
| `SavedProjectPolicy::save` | دور `investor` فقط | `403 FORBIDDEN` |

---

## 6. ملاحظات التنفيذ

1. **العدادات في Redis فقط** — لا جدول `rate_limits` في MySQL (rate-limiting-spec §6.4، NFR-19).
2. **المسارات غير المسجلة** لا يمكن الوصول إليها من هذا الملف إلا عبر السلسلة الكاملة أعلاه — أي مسار خارج `auth:sanctum` هو نقطة عامة مقصودة.
3. **`{project}` في `ai.evaluate`/`ai.analyze`** هو ID رقمي — مفتاح Rate Limit هو `{user_id}:{project_id}`.
4. **استجابات 429 موحّدة** عبر `rateLimitResponse()` (rate-limiting-spec §6.2) مع `Retry-After`.
5. **التحقق من الدور مزدوج**: middleware `role:` للفصل + Policies للتفويضات الدقيقة (الملكية، الإفصاح).
6. **`auth.email-verify`** محدد بـ `user_id` في المواصفة — لكنه يعمل قبل إصدار التوكن عبر `{email, code}`، لذا المفتاح العملي: `input('email') ?: user_id` (إعادة إرسال/تحقق).
7. **أوامر مجدولة مقترحة**: `projects:purge-trash` (حذف نهائي بعد 30 يوماً) · `tokens:prune` (توكنات منتهية).
8. **امتدادات مقترحة خارج الـ 49** (معلَّقة بانتظار قرار المنتج): حذف ملف مشروع (`DELETE /projects/{project}/files/{file}`) — ضروري لتجربة رفع كاملة.
