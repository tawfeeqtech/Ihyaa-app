<?php

namespace App\Http\Controllers\Api;

use App\Enums\AnalysisType;
use App\Models\Project;
use App\Services\AiGateway;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * وكيل AI: تحليل المشاريع — SRS-API-42/43 · RL-AI-01/02.
 * أنواع: competitive | swot | market | comparison (نص/قوالب فقط في MVP — لا MCP خارجي).
 * النتائج تُخزَّن في Cache 24 ساعة (artifact) — لا جدول مخصص في MVP.
 */
class AIAgentController
{
    use ApiResponse;

    /** RL-AI-01 · 3/دقيقة لكل (مستخدم + مشروع) */
    public function analyze(Request $request, Project $project, AiGateway $ai): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        $data = $request->validate([
            'analysis_type' => ['required', Rule::enum(AnalysisType::class)],
        ]);

        $type = $data['analysis_type'];

        $artifact = $ai->analyzeProject($type, [
            'id' => $project->id,
            'title' => $project->title,
            'description' => $project->description,
            'category' => $project->category?->name_en,
            'tags' => $project->tags ?? [],
            'github_url' => $project->github_url,
            'budget_min' => $project->budget_min,
            'budget_max' => $project->budget_max,
        ]);

        $artifactId = Str::uuid()->toString();

        Cache::put("ai_artifact:{$artifactId}", [
            'artifact_id' => $artifactId,
            'project_id' => $project->id,
            'type' => $type,
            'content' => $artifact['content'],
            'summary' => $artifact['summary'],
            'model_used' => $artifact['model_used'],
            'created_at' => now()->toISOString(),
        ], now()->addHours((int) config('ai.artifact_cache_hours')));

        return $this->created([
            'artifact_id' => $artifactId,
            'type' => $type,
            'summary' => $artifact['summary'],
        ], __('ai_agent.analysis_queued'));
    }

    /** RL-AI-02 · 10/دقيقة */
    public function show(string $artifact): JsonResponse
    {
        $data = Cache::get("ai_artifact:{$artifact}");

        if (! $data) {
            return $this->notFound(__('ai_agent.artifact_not_found'));
        }

        return $this->success($data);
    }
}
