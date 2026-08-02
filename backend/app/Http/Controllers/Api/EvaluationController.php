<?php

namespace App\Http\Controllers\Api;

use App\Enums\EvaluationStatus;
use App\Jobs\ProcessAIEvaluation;
use App\Models\AiEvaluation;
use App\Models\Project;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * التقييم وإعادة التقييم — SRS-API-44..47 · SRS-F03/F04.
 * Rate Limit: 3/دقيقة لكل (user_id + project_id) · كاش 24 ساعة (SRS-AI-C01) ·
 * الحد الأقصى للتقييمات المتزامنة: 3 لكل مستخدم.
 */
class EvaluationController
{
    use ApiResponse;

    public const CACHE_ERROR_CODE = 'EVALUATION_CACHE_ACTIVE';

    public const CONCURRENCY_ERROR_CODE = 'EVALUATION_CONCURRENCY_LIMIT';

    /** L5 — تقييم المشروع (غير متزامن — Queue) */
    public function evaluate(Request $request, Project $project): JsonResponse
    {
        return $this->dispatchEvaluation($request, $project);
    }

    /** L5 — إعادة التقييم اليدوية (زر أو بعد تغيير جوهري — SRS-F04) */
    public function reEvaluate(Request $request, Project $project): JsonResponse
    {
        return $this->dispatchEvaluation($request, $project);
    }

    /** L5 — إعادة محاولة تقييم فاشل (SRS-API-46) */
    public function retry(Request $request, Project $project, AiEvaluation $evaluation): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        if ((int) $evaluation->project_id !== (int) $project->id) {
            return $this->notFound();
        }

        // فقط الفاشل/الجزئي يُعاد (المكتمل → خطأ)
        if ($evaluation->status->isTerminal() && $evaluation->status !== EvaluationStatus::FAILED
            && $evaluation->status !== EvaluationStatus::PARTIAL) {
            return $this->unprocessable('EVALUATION_NOT_FAILED', __('evaluation.not_failed'));
        }

        $guard = $this->guards($request, $project);
        if ($guard !== null) {
            return $guard;
        }

        ProcessAIEvaluation::dispatch($project);

        return $this->accepted([
            'project_id' => $project->id,
            'status' => 'processing',
        ], __('evaluation.queued'));
    }

    /** L3 — حالة التقييم (RL-IO-08 · 30/دقيقة) */
    public function status(Request $request, Project $project): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        $latest = $project->evaluations()->first();

        if (! $latest) {
            return $this->success([
                'project_id' => $project->id,
                'status' => 'never_evaluated',
            ]);
        }

        // التقدم: كم بُعداً اكتمل من 5 (Counter في Cache/Redis)
        $dimensionsDone = Cache::get("ai_eval:{$latest->id}:finished");
        $total = count(config('ai.weights'));

        return $this->success([
            'project_id' => $project->id,
            'evaluation_id' => $latest->id,
            'version' => $latest->version,
            'status' => $latest->status->value,
            'overall_score' => $latest->overall_score,
            'dimensions_done' => $dimensionsDone !== null ? min((int) $dimensionsDone, $total) : null,
            'dimensions_total' => $total,
            'evaluated_at' => $latest->created_at?->toISOString(),
        ]);
    }

    /** تقرير JSON كامل — Owner دائماً / Investor بعد الاتفاق (SRS-API-48) */
    public function report(Request $request, Project $project, AiEvaluation $evaluation): JsonResponse
    {
        $user = $request->user();

        if (! $project->isOwner($user) && ! ($user && $project->hasAcceptedInterestFrom($user))) {
            return $this->forbidden();
        }

        if ((int) $evaluation->project_id !== (int) $project->id) {
            return $this->notFound();
        }

        return $this->success($evaluation->toReportArray('full'));
    }

    // ——————————————————————— أدوات ———————————————————————

    protected function dispatchEvaluation(Request $request, Project $project): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        $guard = $this->guards($request, $project);
        if ($guard !== null) {
            return $guard;
        }

        ProcessAIEvaluation::dispatch($project);

        return $this->accepted([
            'project_id' => $project->id,
            'status' => 'processing',
        ], __('evaluation.queued'));
    }

    /**
     * الحراسة: ملكية (مسبقاً) · كاش 24 ساعة · حد التزامن 3/مستخدم.
     * تُعيد استجابة الخطأ أو null للمتابعة.
     */
    protected function guards(Request $request, Project $project): ?JsonResponse
    {
        // كاش 24 ساعة (SRS-AI-C01): لا تقييم قبل مرور 24 ساعة من آخر تقييم
        if ($project->last_evaluation_at && $project->last_evaluation_at->gt(now()->subHours((int) config('ai.re_evaluation_cache_hours')))) {
            // حساب عددي صريح للثواني المتبقية (يتجنب اختلاف توقيعات Carbon diff*)
            $retryAfter = (int) ceil(
                $project->last_evaluation_at->addHours((int) config('ai.re_evaluation_cache_hours'))->timestamp
                - now()->timestamp
            );

            return $this->error(
                self::CACHE_ERROR_CODE,
                __('evaluation.cache_active', ['minutes' => (int) config('ai.re_evaluation_cache_hours') * 60]),
                429,
                null,
                ['retry_after' => max(0, $retryAfter)]
            );
        }

        // حد التزامن: 3 تقييمات قيد المعالجة لكل مستخدم (enums.md §2.4)
        $processing = $request->user()->projects()
            ->whereHas('evaluations', fn ($q) => $q->where('status', EvaluationStatus::PROCESSING))
            ->count();

        if ($processing >= (int) config('ai.max_concurrent_per_user', 3)) {
            return $this->error(self::CONCURRENCY_ERROR_CODE, __('evaluation.concurrency_limit'), 429);
        }

        return null;
    }
}
