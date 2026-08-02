<?php

namespace App\Http\Controllers\Api;

use App\Models\Project;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * اقتراحات الوسوم — SRS-API-49 · RL-PUB-01 (30/دقيقة · IP).
 * حتى 10 اقتراحات — تُستخرج من وسوم المشاريع المنشورة (Cache 10 دقائق).
 */
class TagController
{
    use ApiResponse;

    public function suggestions(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:50'],
        ]);

        $term = strtolower((string) $request->input('q', ''));

        $tags = Cache::remember('tags:suggestions', 600, function () {
            $tags = [];

            Project::query()
                ->published()
                ->whereNotNull('tags')
                ->orderByDesc('view_count')
                ->limit(500)
                ->pluck('tags')
                ->each(function ($projectTags) use (&$tags) {
                    foreach ((array) $projectTags as $tag) {
                        $tag = trim((string) $tag);
                        if ($tag !== '') {
                            $tags[$tag] = ($tags[$tag] ?? 0) + 1;
                        }
                    }
                });

            return $tags;
        });

        // فلترة + ترتيب حسب الشعبية
        $suggestions = collect($tags)
            ->filter(fn ($count, $tag) => $term === '' || str_contains(strtolower($tag), $term))
            ->sortDesc()
            ->keys()
            ->take(10)
            ->values();

        return $this->success(['suggestions' => $suggestions]);
    }
}
