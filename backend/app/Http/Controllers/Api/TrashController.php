<?php

namespace App\Http\Controllers\Api;

use App\Models\Project;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * سلة المهملات — SRS-API-35..37 · SRS-F02-06.
 * الاسترجاع خلال 30 يوماً · الحذف النهائي التلقائي بعدها (أمر مجدول projects:purge-trash).
 */
class TrashController
{
    use ApiResponse;

    /** RL-IO-10 · 20/دقيقة */
    public function index(Request $request): JsonResponse
    {
        $projects = $request->user()->projects()
            ->trash()   // onlyTrashed + ضمن 30 يوماً
            ->with(['category'])
            ->orderByDesc('deleted_at')
            ->paginate(Project::DEFAULT_PAGE_SIZE);

        $data = $projects->map(fn (Project $p) => array_merge($p->toCardArray(), [
            'deleted_at' => $p->deleted_at?->toISOString(),
            // الأيام المتبقية للاسترجاع — حساب عددي صريح (يتجنب اختلاف توقيعات Carbon)
            'days_left' => $p->deleted_at
                ? max(0, (int) ceil(($p->deleted_at->addDays(Project::TRASH_RECOVERY_DAYS)->timestamp - now()->timestamp) / 86400))
                : null,
        ]));

        return $this->paginated($projects, $data);
    }

    /** RL-IO-11 · 10/دقيقة */
    public function restore(Request $request, Project $project): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        if (! $project->trashed()) {
            return $this->unprocessable('PROJECT_NOT_TRASHED', __('trash.not_trashed'));
        }

        // انتهت مدة الاسترجاع (30 يوماً) → حذف نهائي فقط
        if ($project->deleted_at->lt(now()->subDays(Project::TRASH_RECOVERY_DAYS))) {
            return $this->error('TRASH_EXPIRED', __('trash.expired'), 410);
        }

        $project->restore();

        return $this->success(['restored' => true], __('trash.restored'));
    }

    /** RL-IO-12 · 10/دقيقة */
    public function forceDelete(Request $request, Project $project): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        if (! $project->trashed()) {
            return $this->unprocessable('PROJECT_NOT_TRASHED', __('trash.not_trashed'));
        }

        // حذف الملفات من Local Disk ثم المشروع نهائياً
        foreach ($project->files()->withTrashed()->get() as $file) {
            Storage::disk('public')->delete($file->file_path);
        }

        $project->forceDelete();

        return $this->noContent(__('trash.force_deleted'));
    }
}
