<?php

namespace App\Http\Controllers\Api;

use App\Enums\EvaluationStatus;
use App\Enums\ProjectState;
use App\Enums\ProjectStatus;
use App\Enums\VisibilityLevel;
use App\Models\AiEvaluation;
use App\Models\Project;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * المشاريع — SRS-API-13..17, 19, 20, 21 · L2/L3.
 * L2: index (معرض عام) · show (إفصاح 1/2/3) · L3: CRUD لصاحب الفكرة (تحقق ملكية).
 */
class ProjectController
{
    use ApiResponse;

    // ——————————————————————— L2: المعرض العام (RL-PUB-01 · 30/دقيقة) ———————————————————————

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', Rule::enum(ProjectState::class)],
            'min_score' => ['nullable', 'numeric', 'between:0,100'],
            'max_score' => ['nullable', 'numeric', 'between:0,100'],
            'sort' => ['nullable', Rule::in(['ai_score', 'created_at', 'view_count'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.Project::MAX_PAGE_SIZE],
        ]);

        $perPage = min((int) $request->input('per_page', Project::DEFAULT_PAGE_SIZE), Project::MAX_PAGE_SIZE);

        $minScore = $request->has('min_score') ? (float) $request->input('min_score') : null;
        $maxScore = $request->has('max_score') ? (float) $request->input('max_score') : null;

        $projects = Project::query()
            ->with(['category', 'files' => fn ($q) => $q->where('type', 'image')])
            ->published()
            ->ofCategory($request->input('category'))
            ->ofState($request->input('state'))
            ->scoreBetween($minScore, $maxScore)
            ->search($request->input('q'))
            ->sortBy($request->input('sort'), $request->input('direction'))
            ->paginate($perPage);

        return $this->paginated($projects, $projects->map(fn (Project $p) => $p->toCardArray()));
    }

    // ——————————————————————— L2: تفاصيل المشروع (RL-PUB-02 · 60/دقيقة — مخزّن مؤقتاً) ———————————————————————

    public function show(Request $request, Project $project): JsonResponse
    {
        // المسار عام (L2) — حارس sanctum يقرأ التوكن إن وُجد (إفصاح 1/2/3)
        $viewer = $request->user('sanctum');

        // فقط المنشور — إلا للمالك (المسودة/المؤرشف في لوحة التحكم)
        if ($project->publication_status !== ProjectStatus::PUBLISHED && ! $project->isOwner($viewer)) {
            return $this->notFound();
        }

        // عدّ المشاهدات (بلا عدّ لمالكها)
        if ($project->publication_status === ProjectStatus::PUBLISHED && ! $project->isOwner($viewer)) {
            $project->increment('view_count');
        }

        $reportAccess = $project->reportAccessFor($viewer);

        $latest = $project->evaluations()
            ->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL])
            ->first();

        $data = $project->toCardArray($viewer);
        $data['description'] = $project->description;
        $data['publication_status'] = $project->publication_status->value;
        $data['github_url'] = $project->github_url;
        $data['video'] = $project->video_url ? [
            'url' => $project->video_url,
            'provider' => $project->video_provider?->value,
        ] : null;
        $data['files'] = $project->files->map->toArrayApi();
        $data['owner'] = $project->isOwner($viewer) || $reportAccess === 'full' ? [
            'id' => $project->owner->id,
            'name' => $project->owner->name,
            'avatar_url' => $project->owner->avatar_path ? asset('storage/'.$project->owner->avatar_path) : null,
            'email' => $reportAccess === 'full' ? $project->owner->email : null, // كشف البريد بعد الاتفاق فقط (UC-07)
        ] : null;
        $data['report_access'] = $reportAccess;
        $data['evaluation'] = $latest ? $latest->toReportArray($reportAccess) : null;

        return $this->success($data);
    }

    // ——————————————————————— L3: الإنشاء (RL-IO-04 · 10/دقيقة) ———————————————————————

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateProject($request);

        $project = $request->user()->projects()->create($data);

        return $this->created($this->projectDetail($project), __('projects.created'));
    }

    // ——————————————————————— L3: التحديث (RL-IO-05 · 10/دقيقة) ———————————————————————

    public function update(Request $request, Project $project): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        $original = $project->only(['description', 'tags', 'github_url', 'status']);

        $data = $this->validateProject($request, forUpdate: true);

        $project->update($data);

        // الحقول الجوهرية تتغير → اقتراح إعادة تقييم يدوية (SRS-F04-02) — لا تلقائية
        $significantChanged = collect($original)->some(
            fn ($value, $key) => json_encode($value) !== json_encode($project->{$key})
        );

        return $this->success([
            'project' => $this->projectDetail($project->fresh()),
            'needs_reevaluation' => $significantChanged,
        ], __('projects.updated'));
    }

    // ——————————————————————— L3: الحذف الناعم (RL-IO-06 · 10/دقيقة — سلة 30 يوماً) ———————————————————————

    public function destroy(Request $request, Project $project): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        $project->delete();

        return $this->noContent(__('projects.moved_to_trash'));
    }

    /** الاستعادة من سلة المهملات — خلال 30 يوماً (SRS-F02-06) */
    public function restore(Request $request, Project $project): JsonResponse
    {
        return app(TrashController::class)->restore($request, $project);
    }

    // ——————————————————————— L3/L4: آخر 5 تقييمات مكتملة (RL-IO-08 · 30/دقيقة) ———————————————————————

    public function evaluations(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();

        // Owner دائماً / Investor بعد اتفاق مقبول — خلاف ذلك 403 (EvaluationPolicy)
        if (! $project->isOwner($user) && ! ($user && $project->hasAcceptedInterestFrom($user))) {
            return $this->forbidden();
        }

        $access = 'full'; // الطرفان المخوّلان يريان كل شيء (مستوى 3)

        $evaluations = $project->evaluations()
            ->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL])
            ->limit(5)
            ->get()
            ->map(fn (AiEvaluation $e) => $e->toReportArray($access));

        return $this->success($evaluations);
    }

    // ——————————————————————— أدوات ———————————————————————

    protected function validateProject(Request $request, bool $forUpdate = false): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'min:5', 'max:120'],
            'description' => ['required', 'string', 'min:50', 'max:2000'],       // 50–2000 حرف
            'category_id' => ['required', 'exists:categories,id'],
            'status' => ['required', Rule::enum(ProjectState::class)],
            'publication_status' => ['sometimes', Rule::enum(ProjectStatus::class)],
            'tags' => ['nullable', 'array', 'max:'.Project::MAX_TAGS],
            'tags.*' => ['string', 'max:50'],
            'github_url' => ['nullable', 'url', 'max:255'],
            'video_url' => ['nullable', 'url', 'max:255',
                'regex:/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+$/i', // SRS-F02-03
            ],
            'video_provider' => ['required_with:video_url', Rule::in(['youtube', 'vimeo'])],
            'budget_min' => ['nullable', 'numeric', 'min:0', 'max:999999999999'],
            'budget_max' => ['nullable', 'numeric', 'gte:budget_min', 'max:999999999999'],
            'visibility_level' => ['sometimes', Rule::enum(VisibilityLevel::class)],
        ]);
    }

    /** تفاصيل كاملة (للمالك — مستوى إفصاح كامل) */
    protected function projectDetail(Project $project): array
    {
        $project->refresh(); // الحقول الافتراضية من DB (publication_status ...)
        $project->load(['category', 'files', 'owner']);

        $latest = $project->evaluations()
            ->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL])
            ->first();

        $data = $project->toCardArray();
        $data['description'] = $project->description;
        $data['publication_status'] = $project->publication_status->value;
        $data['github_url'] = $project->github_url;
        $data['video'] = $project->video_url ? [
            'url' => $project->video_url,
            'provider' => $project->video_provider?->value,
        ] : null;
        $data['files'] = $project->files->map->toArrayApi();
        $data['report_access'] = 'full';
        $data['evaluation'] = $latest ? $latest->toReportArray('full') : null;

        return $data;
    }
}
