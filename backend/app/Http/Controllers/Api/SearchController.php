<?php

namespace App\Http\Controllers\Api;

use App\Models\Project;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * البحث — SRS-API-20/21 · RL-PUB-03/04 (30/دقيقة · IP).
 * MVP: MySQL LIKE — يُستبدل بـ Meilisearch عبر Laravel Scout (متزامن تلقائياً) عند توفر الحزمة.
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

        $projects = Project::query()
            ->with(['category', 'files' => fn ($q) => $q->where('type', 'image')])
            ->published()
            ->ofCategory($request->input('category'))
            ->ofState($request->input('state'))
            ->search($request->input('q'))
            ->sortBy($request->input('sort'))
            ->paginate($perPage);

        return $this->paginated(
            $projects,
            $projects->map(fn (Project $p) => $p->toCardArray())
        );
    }

    /** اقتراحات البحث — حتى 5 اقتراحات (SRS-F06-02 · Debounce 300ms) */
    public function suggestions(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'max:100'],
        ]);

        $term = $request->input('q');

        // بحث خفيف في العناوين المنشورة فقط
        $suggestions = Project::query()
            ->published()
            ->where('title', 'like', "%{$term}%")
            ->orderByDesc('view_count')
            ->limit(5)
            ->pluck('title');

        return $this->success(['suggestions' => $suggestions]);
    }
}
