<?php

namespace App\Providers;

use App\Models\Project;
use App\Observers\ProjectObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();

        // مزامنة فهرس البحث تلقائياً عند إنشاء/تعديل/حذف/استرجاع المشاريع (plan §5.3 · T127)
        Project::observe(ProjectObserver::class);
    }

    /**
     * Named Rate Limiters — المستويات السبعة (rate-limiting-spec §6 · docs/api/routes.md §3).
     * العدادات في Redis/ذاكرة التخزين فقط — لا جدول rate_limits في MySQL.
     */
    protected function configureRateLimiting(): void
    {
        // ---------------- L1: المصادقة (SRS-NFR-17 · plan.md Rate Limiter Definitions) ----------------
        RateLimiter::for('api.register', fn (Request $r) => Limit::perMinute(3)->by($r->ip()));                                  // SRS-API-01 · RL-AUTH-01 · 3/دقيقة
        RateLimiter::for('api.login', fn (Request $r) => Limit::perMinute(5)->by($r->input('email') ?: $r->ip()));              // SRS-API-02 · RL-AUTH-02 · 5/دقيقة · email
        RateLimiter::for('api.logout', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));                // SRS-API-03 · RL-AUTH-03 · 10/دقيقة · user_id
        RateLimiter::for('api.otp', fn (Request $r) => Limit::perMinute(3)->by($r->input('email') ?: $r->ip()));                 // SRS-API-04 · RL-AUTH-04 · 3/دقيقة · email (منع توزيع الهجوم)
        RateLimiter::for('api.forgot', fn (Request $r) => Limit::perMinute(2)->by($r->input('email') ?: $r->ip()));              // SRS-API-05 · RL-AUTH-05 · 2/دقيقة · email
        RateLimiter::for('api.reset', fn (Request $r) => Limit::perMinute(2)->by($r->input('email') ?: $r->ip()));               // SRS-API-06 · RL-AUTH-06 · 2/دقيقة · email
        RateLimiter::for('api.oauth', fn (Request $r) => Limit::perMinute(5)->by($r->ip()));                                     // SRS-API-07/08 · RL-AUTH-07/08 · 5/دقيقة

        // ---------------- L2: التصفح العام (IP) ----------------
        RateLimiter::for('public.browse', fn (Request $r) => Limit::perMinute(30)->by($r->ip()));                                   // RL-PUB-01/03/04/05
        RateLimiter::for('public.detail', fn (Request $r) => Limit::perMinute(60)->by($r->ip()));                                   // RL-PUB-02 (مخزّن مؤقتاً)

        // ---------------- L3: صاحب فكرة ----------------
        RateLimiter::for('idea-owner.read', fn (Request $r) => Limit::perMinute(60)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('idea-owner.write', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));

        // ---------------- L4: مستثمر ----------------
        RateLimiter::for('investor.read', fn (Request $r) => Limit::perMinute(120)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('investor.write', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));

        // ---------------- L5: العمليات المكلفة (AI + رفع) ----------------
        RateLimiter::for('ai.analyze', fn (Request $r) => Limit::perMinute(3)->by($r->user()?->id.':'.$r->route('project')?->id));    // RL-AI-01 user+project (implicit binding → id)
        RateLimiter::for('ai.evaluate', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));                // SRS-API-44..46 · 10/دقيقة/مستخدم (evaluation-api.md §1)
        RateLimiter::for('ai.report', fn (Request $r) => Limit::perHour(20)->by($r->user()?->id ?: $r->ip()));                    // RL-AI-02 + SRS-API-48 · 20/ساعة/مستخدم (sprint2)
        RateLimiter::for('ai.search', fn (Request $r) => Limit::perMinute(60)->by($r->ip()));                                     // search-api.md · 60/دقيقة/عنوان IP
        RateLimiter::for('upload.file', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));                // RL-IO-03/07

        // ---------------- L6: المشرف ----------------
        RateLimiter::for('admin.read', fn (Request $r) => Limit::perMinute(60)->by($r->user()?->id ?: $r->ip()));                // RL-ADM-01
        RateLimiter::for('admin.export', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));                // RL-ADM-02

        // ---------------- L3+L4: نقاط مشتركة (حد حسب الدور) ----------------
        RateLimiter::for('shared.read', function (Request $r) {
            $user = $r->user();
            $limit = $user && $user->role === 'investor' ? 120 : 60;

            return Limit::perMinute($limit)->by($user?->id ?: $r->ip());
        });
        RateLimiter::for('shared.write', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('dashboard', fn (Request $r) => Limit::perMinute(20)->by($r->user()?->id ?: $r->ip()));                // RL-IO-09/RL-INV-09
    }
}
