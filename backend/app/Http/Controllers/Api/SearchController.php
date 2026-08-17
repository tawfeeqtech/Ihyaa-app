<?php

namespace App\Http\Controllers\Api;

use App\Models\Project;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * البحث — SRS-API-20/21 · RL-PUB-03/04 (30/دقيقة · IP).
 * الفهرس عبر Laravel Scout + Meilisearch (متزامن تلقائياً عبر ProjectObserver — plan §5.1/§5.3).
 * الفهرس يضم المنشور وغير المحذوف فقط (FR-247) — لا حاجة لمرشح published على DB.
 */
class SearchController
{
    use ApiResponse;

    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'in:completed,needs_development,needs_funding'],
            'sort' => ['nullable', 'in:ai_score,created_at,view_count'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $perPage = min((int) $request->input('per_page', Project::DEFAULT_PAGE_SIZE), 50);

        // عمود الفرز في الفهرس (sortableAttributes — data-model §8.2):
        // ai_score → overall_score · view_count → views_count · الافتراضي created_at (الأحدث أولاً)
        $sortColumn = match ($request->input('sort')) {
            'ai_score' => 'overall_score',
            'view_count' => 'views_count',
            default => 'created_at',
        };

        $projects = Project::search($request->input('q'))
            ->query(fn ($query) => $query->with(['category', 'files' => fn ($q) => $q->where('type', 'image')]))
            ->when($request->input('category'), fn ($builder, $category) => $builder->where('category', $category))
            ->when($request->input('state'), fn ($builder, $state) => $builder->where('status', $state))
            ->orderBy($sortColumn, 'desc')
            ->paginate($perPage);

        return $this->paginated(
            $projects,
            $projects->map(fn (Project $p) => $p->toCardArray())
        );
    }

    /** اقتراحات البحث — حتى 5 اقتراحات من الفهرس (SRS-F06-02 · Debounce 300ms · plan §5.4) */
    public function suggestions(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'max:100'],
        ]);

        $term = $request->input('q');

        // اقتراحات من Meilisearch (الفهرس يضم المنشور وغير المحذوف فقط — FR-247)
        $suggestions = Project::search($term)
            ->take(5)
            ->get()
            ->pluck('title');

        return $this->success(['suggestions' => $suggestions]);
    }
}
