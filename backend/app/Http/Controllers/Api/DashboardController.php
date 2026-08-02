<?php

namespace App\Http\Controllers\Api;

use App\Enums\EvaluationStatus;
use App\Enums\InterestStatus;
use App\Models\AiEvaluation;
use App\Models\Category;
use App\Models\Interest;
use App\Models\Notification;
use App\Models\Project;
use App\Models\User;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * لوحات التحكم — SRS-API-38/39 · 20/دقيقة (throttle:dashboard).
 * idea-owner: مشاريعي + طلبات الاهتمام + تاريخ التقييمات + آخر 10 أحداث.
 * investor: المحفوظات + الطلبات المرسلة + مشاريع مقترحة (حتى 10).
 */
class DashboardController
{
    use ApiResponse;

    /** RL-IO-09 · 20/دقيقة */
    public function ideaOwner(Request $request): JsonResponse
    {
        $user = $request->user();

        $projectStats = [
            'total' => $user->projects()->count(),
            'published' => $user->projects()->where('publication_status', 'published')->count(),
            'drafts' => $user->projects()->where('publication_status', 'draft')->count(),
            'archived' => $user->projects()->where('publication_status', 'archived')->count(),
            'trashed' => $user->projects()->onlyTrashed()->count(),
        ];

        $interests = $user->interestsReceived();

        $interestStats = [
            'total' => (clone $interests)->count(),
            'pending' => (clone $interests)->where('interests.status', InterestStatus::PENDING)->count(),
            'accepted' => (clone $interests)->where('interests.status', InterestStatus::ACCEPTED)->count(),
            'rejected' => (clone $interests)->where('interests.status', InterestStatus::REJECTED)->count(),
        ];

        // تاريخ التقييمات (آخر 5 مكتملة للمقارنة — SRS-DB-05)
        $evaluations = $user->projects()
            ->whereHas('evaluations', fn ($q) => $q->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL]))
            ->with(['evaluations' => fn ($q) => $q->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL])->orderByDesc('version')])
            ->get()
            ->flatMap->evaluations
            ->sortByDesc('created_at')
            ->take(5)
            ->values()
            ->map(fn ($e) => [
                'id' => $e->id,
                'project_id' => $e->project_id,
                'project_title' => $e->project->title ?? null,
                'version' => $e->version,
                'overall_score' => $e->overall_score,
                'status' => $e->status->value,
                'evaluated_at' => $e->created_at?->toISOString(),
            ]);

        // آخر 10 أحداث (تغذية اللوحة — SRS-API-38)
        $recentEvents = $user->notifications()
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn (Notification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'data' => $n->data,
                'created_at' => $n->created_at?->toISOString(),
            ]);

        return $this->success([
            'project_stats' => $projectStats,
            'interest_stats' => $interestStats,
            'recent_evaluations' => $evaluations,
            'recent_events' => $recentEvents,
            'unread_notifications' => $user->notifications()->unread()->count(),
        ]);
    }

    /** RL-INV-09 · 20/دقيقة */
    public function investor(Request $request): JsonResponse
    {
        $user = $request->user();

        $sent = $user->interestsSent();

        $interestStats = [
            'total' => (clone $sent)->count(),
            'pending' => (clone $sent)->where('status', InterestStatus::PENDING)->count(),
            'accepted' => (clone $sent)->where('status', InterestStatus::ACCEPTED)->count(),
            'rejected' => (clone $sent)->where('status', InterestStatus::REJECTED)->count(),
        ];

        $savedCount = $user->savedProjects()->count();

        // مشاريع مقترحة — حتى 10 بأعلى تقييم (SRS-API-39)
        $suggested = Project::query()
            ->with(['category'])
            ->published()
            ->where('ai_score', '>=', 60)
            ->orderByDesc('ai_score')
            ->limit(10)
            ->get()
            ->map->toCardArray();

        $recentInterests = $sent
            ->with(['project.category'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn (Interest $i) => array_merge($i->toApiArray(), [
                'project' => $i->project?->toCardArray(),
            ]));

        return $this->success([
            'interest_stats' => $interestStats,
            'saved_count' => $savedCount,
            'suggested_projects' => $suggested,
            'recent_interests' => $recentInterests,
            'unread_notifications' => $user->notifications()->unread()->count(),
        ]);
    }

    /** لوحة المشرف — SRS-API-40 (تُستخدم من AdminController) */
    public function adminStats(): array
    {
        $users = User::query();
        $projects = Project::query();
        $evaluations = AiEvaluation::query();

        return [
            'users' => [
                'total' => (clone $users)->count(),
                'idea_owners' => (clone $users)->where('role', 'idea_owner')->count(),
                'investors' => (clone $users)->where('role', 'investor')->count(),
                'admins' => (clone $users)->where('role', 'admin')->count(),
                'active_7d' => (clone $users)->where('last_login_at', '>=', now()->subDays(7))->count(), // SRS-F12-02
            ],
            'projects' => [
                'total' => (clone $projects)->count(),
                'published' => (clone $projects)->where('publication_status', 'published')->count(),
                'drafts' => (clone $projects)->where('publication_status', 'draft')->count(),
                'trashed' => (clone $projects)->onlyTrashed()->count(),
                'avg_ai_score' => round((float) (clone $projects)->avg('ai_score'), 2),
                'by_state' => [
                    'completed' => (clone $projects)->where('status', 'completed')->count(),
                    'needs_development' => (clone $projects)->where('status', 'needs_development')->count(),
                    'needs_funding' => (clone $projects)->where('status', 'needs_funding')->count(),
                ],
                'by_category' => Category::query()
                    ->withCount('projects')
                    ->orderByDesc('projects_count')
                    ->get()
                    ->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name(), 'count' => $c->projects_count]),
            ],
            'evaluations' => [
                'total' => (clone $evaluations)->count(),
                'completed' => (clone $evaluations)->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL])->count(),
                'processing' => (clone $evaluations)->where('status', EvaluationStatus::PROCESSING)->count(),
                'failed' => (clone $evaluations)->where('status', EvaluationStatus::FAILED)->count(),
                'avg_processing_time_ms' => round((float) (clone $evaluations)->avg('processing_time_ms'), 0),
            ],
            'interests' => [
                'total' => Interest::query()->count(),
                'pending' => Interest::query()->where('status', InterestStatus::PENDING)->count(),
                'accepted' => Interest::query()->where('status', InterestStatus::ACCEPTED)->count(),
            ],
        ];
    }
}
