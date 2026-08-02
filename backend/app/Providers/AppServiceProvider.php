<?php

namespace App\Providers;

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
    }

    /**
     * Named Rate Limiters — المستويات السبعة (rate-limiting-spec §6 · docs/api/routes.md §3).
     * العدادات في Redis/ذاكرة التخزين فقط — لا جدول rate_limits في MySQL.
     */
    protected function configureRateLimiting(): void
    {
        // ---------------- L1: المصادقة (SRS-NFR-17) ----------------
        RateLimiter::for('auth.register', fn (Request $r) => Limit::perMinute(3)->by($r->ip()));                                    // RL-AUTH-01
        RateLimiter::for('auth.login', fn (Request $r) => Limit::perMinute(5)->by($r->input('email') ?: $r->ip()));              // RL-AUTH-02
        RateLimiter::for('auth.logout', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));                // RL-AUTH-03
        RateLimiter::for('auth.email-verify', fn (Request $r) => Limit::perMinute(3)->by($r->input('email') ?: $r->user()?->id ?: $r->ip())); // RL-AUTH-04
        RateLimiter::for('auth.forgot-password', fn (Request $r) => Limit::perMinute(2)->by($r->input('email') ?: $r->ip()));              // RL-AUTH-05
        RateLimiter::for('auth.reset-password', fn (Request $r) => Limit::perMinute(2)->by($r->input('email') ?: $r->ip()));              // RL-AUTH-06
        RateLimiter::for('auth.oauth', fn (Request $r) => Limit::perMinute(5)->by($r->ip()));                                    // RL-AUTH-07/08

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
        RateLimiter::for('ai.analyze', fn (Request $r) => Limit::perMinute(3)->by($r->user()?->id.':'.$r->route('project')));    // RL-AI-01 user+project
        RateLimiter::for('ai.evaluate', fn (Request $r) => Limit::perMinute(3)->by($r->user()?->id.':'.$r->route('project')));    // SRS-API-44..46
        RateLimiter::for('ai.report', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));                // RL-AI-02 + SRS-API-48
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
