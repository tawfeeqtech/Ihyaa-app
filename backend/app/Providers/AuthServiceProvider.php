<?php

namespace App\Providers;

use App\Models\Project;
use App\Policies\ProjectPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

/**
 * T162 — تسجيل سياسات التفويض.
 *
 * Laravel 13 يكتشف الـ policies تلقائياً بالاصطلاح (Model + Policy) —
 * التسجيل هنا صريح لتوثيق الاقتران وتوحيد نقطة التسجيل مستقبلاً.
 */
class AuthServiceProvider extends ServiceProvider
{
    /**
     * خرائط النماذج → سياساتها.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Project::class => ProjectPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
