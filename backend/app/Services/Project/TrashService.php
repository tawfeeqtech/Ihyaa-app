<?php

namespace App\Services\Project;

use App\Models\Project;
use App\Models\User;
use DomainException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;

/**
 * T160 — سلة المهملات (SRS-API-35..37 · SRS-F02-06).
 *
 * الاسترجاع خلال 30 يوماً · الحذف النهائي يمسح ملفات القرص ثم المشروع.
 * (قرارات خطأ HTTP — PROJECT_NOT_TRASHED / TRASH_EXPIRED — تُرمى كـ DomainException
 *  ويلتقطها TrashController ويحوّلها إلى استجابات ApiResponse.)
 */
class TrashService
{
    /** صفحات سلة المهملات — مشاريع المالك المحذوفة خلال 30 يوماً. */
    public function paginate(User $user): LengthAwarePaginator
    {
        return $user->projects()
            ->trash()   // onlyTrashed + ضمن 30 يوماً
            ->with(['category'])
            ->orderByDesc('deleted_at')
            ->paginate(Project::DEFAULT_PAGE_SIZE);
    }

    /** بطاقة سلة المهملات — deleted_at + restore_deadline + days_remaining (contract §trashed-projects). */
    public function card(Project $project): array
    {
        $deadline = $project->deleted_at?->copy()->addDays(Project::TRASH_RECOVERY_DAYS);

        return array_merge($project->toCardArray(), [
            'deleted_at' => $project->deleted_at?->toISOString(),
            // موعد انتهاء مهلة الاسترجاع — contract (T166)
            'restore_deadline' => $deadline?->toISOString(),
            // الأيام المتبقية — حساب عددي صريح (يتجنب اختلاف توقيعات Carbon)
            'days_remaining' => $project->deleted_at
                ? max(0, (int) ceil(($deadline->timestamp - now()->timestamp) / 86400))
                : null,
        ]);
    }

    /**
     * استرجاع مشروع من السلة (SRS-API-36).
     *
     * @throws DomainException برمز PROJECT_NOT_TRASHED أو TRASH_EXPIRED
     */
    public function restore(Project $project): void
    {
        if (! $project->trashed()) {
            throw new DomainException('PROJECT_NOT_TRASHED');
        }

        // انتهت مدة الاسترجاع (30 يوماً) → حذف نهائي فقط
        if ($project->deleted_at->lt(now()->subDays(Project::TRASH_RECOVERY_DAYS))) {
            throw new DomainException('TRASH_EXPIRED');
        }

        $project->restore();
    }

    /**
     * حذف نهائي (SRS-API-37) — يمسح ملفات Local Disk ثم المشروع نهائياً.
     * (ProjectFile لا يستخدم SoftDeletes — withTrashed غير صالح هنا.)
     *
     * @throws DomainException برمز PROJECT_NOT_TRASHED
     */
    public function forceDelete(Project $project): void
    {
        if (! $project->trashed()) {
            throw new DomainException('PROJECT_NOT_TRASHED');
        }

        foreach ($project->files()->get() as $file) {
            Storage::disk('public')->delete($file->file_path);
        }

        $project->forceDelete();
    }
}
