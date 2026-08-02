<?php

namespace App\Models;

use App\Enums\EvaluationStatus;
use App\Enums\FileType;
use App\Enums\InterestStatus;
use App\Enums\ProjectState;
use App\Enums\ProjectStatus;
use App\Enums\VideoProvider;
use App\Enums\VisibilityLevel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    public const TRASH_RECOVERY_DAYS = 30;          // سلة مهملات 30 يوماً (SRS-F02-06)

    public const RE_EVALUATION_CACHE_HOURS = 24;    // كاش إعادة التقييم (SRS-AI-C01)

    public const MAX_TAGS = 10;

    public const DEFAULT_PAGE_SIZE = 12;            // SRS-F07-05

    public const MAX_PAGE_SIZE = 50;

    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'description',
        'status',
        'publication_status',
        'tags',
        'github_url',
        'video_url',
        'video_provider',
        'budget_min',
        'budget_max',
        'visibility_level',
        'ai_score',
        'view_count',
        'last_evaluation_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ProjectState::class,
            'publication_status' => ProjectStatus::class,
            'visibility_level' => VisibilityLevel::class,
            'video_provider' => VideoProvider::class,
            'tags' => 'array',
            'budget_min' => 'float',
            'budget_max' => 'float',
            'ai_score' => 'float',
            'view_count' => 'integer',
            'last_evaluation_at' => 'datetime',
        ];
    }

    // ——————————————————————— العلاقات ———————————————————————

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(ProjectFile::class)->orderBy('sort_order');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(AiEvaluation::class)->orderByDesc('version');
    }

    public function interests(): HasMany
    {
        return $this->hasMany(Interest::class);
    }

    public function savedBy(): HasMany
    {
        return $this->hasMany(SavedProject::class);
    }

    // ——————————————————————— Scopes ———————————————————————

    /** المشاريع المنشورة فقط (المعرض والبحث) */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('publication_status', ProjectStatus::PUBLISHED);
    }

    /** فلترة بالحالة التجارية (completed / needs_development / needs_funding) */
    public function scopeOfState(Builder $query, ?string $state): Builder
    {
        return $state ? $query->where('status', $state) : $query;
    }

    public function scopeOfCategory(Builder $query, ?string $slug): Builder
    {
        return $slug
            ? $query->whereHas('category', fn (Builder $q) => $q->where('slug', $slug))
            : $query;
    }

    /** فلترة بدرجة التقييم */
    public function scopeScoreBetween(Builder $query, ?float $min, ?float $max): Builder
    {
        if ($min !== null) {
            $query->where('ai_score', '>=', $min);
        }
        if ($max !== null) {
            $query->where('ai_score', '<=', $max);
        }

        return $query;
    }

    /** بحث نصي بسيط (يُستبدل بـ Meilisearch/Scout في مرحلة لاحقة) */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        return $term
            ? $query->where(function (Builder $q) use ($term) {
                $q->where('title', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhere('tags', 'like', "%{$term}%");
            })
            : $query;
    }

    /** الفرز: ai_score | created_at | view_count (SRS-F06-04) */
    public function scopeSortBy(Builder $query, ?string $sort = 'created_at', ?string $direction = 'desc'): Builder
    {
        $column = match ($sort) {
            'ai_score', 'view_count' => $sort,
            default => 'created_at',
        };

        return $query->orderBy($column, strtolower($direction) === 'asc' ? 'asc' : 'desc');
    }

    /** مشاريع المالك المحذوفة (سلة المهملات) — ضمن 30 يوماً */
    public function scopeTrash(Builder $query): Builder
    {
        return $query->onlyTrashed()
            ->where('deleted_at', '>=', now()->subDays(self::TRASH_RECOVERY_DAYS));
    }

    // ——————————————————————— الإفصاح (SRS-F05-05) ———————————————————————

    public function isOwner(?User $user): bool
    {
        return $user !== null && (int) $user->id === (int) $this->user_id;
    }

    /** هل لدى المستثمر طلب اهتمام مقبول؟ */
    public function hasAcceptedInterestFrom(User $user): bool
    {
        return $this->interests()
            ->where('investor_id', $user->id)
            ->where('status', InterestStatus::ACCEPTED)
            ->exists();
    }

    /**
     * مستوى الوصول الفعلي للتقرير — docs/api/enums.md §1.4:
     * none | overall | dimensions | full
     */
    public function reportAccessFor(?User $user): string
    {
        if ($this->isOwner($user) || ($user && $this->hasAcceptedInterestFrom($user))) {
            return 'full';
        }

        if ($user) {
            return match ($this->visibility_level) {
                VisibilityLevel::VISITOR => 'overall',
                VisibilityLevel::REGISTERED => 'dimensions',
                VisibilityLevel::AFTER_AGREEMENT => 'none',
            };
        }

        return $this->visibility_level === VisibilityLevel::VISITOR ? 'overall' : 'none';
    }

    /** المستوى الفعلي المطبَّق (يُرجع في كل استجابة — SRS §1.4) */
    public function effectiveVisibilityFor(?User $user): int
    {
        if ($this->isOwner($user) || ($user && $this->hasAcceptedInterestFrom($user))) {
            return VisibilityLevel::AFTER_AGREEMENT->value;
        }

        if ($user) {
            return min(VisibilityLevel::REGISTERED->value, $this->visibility_level->value);
        }

        return $this->visibility_level === VisibilityLevel::VISITOR
            ? VisibilityLevel::VISITOR->value
            : 0;
    }

    /** آخر تقييم مكتمل (أو جزئي) — للعرض والفرز */
    public function latestEvaluation(): ?AiEvaluation
    {
        return $this->evaluations()
            ->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL])
            ->first();
    }

    public function coverUrl(): ?string
    {
        $cover = $this->files()->where('type', FileType::IMAGE)->where('is_cover', true)->first()
            ?? $this->files()->where('type', FileType::IMAGE)->first();

        return $cover ? asset('storage/'.$cover->file_path) : null;
    }

    /** بطاقة المعرض (SRS-F07) */
    public function toCardArray(?User $viewer = null): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category ? [
                'slug' => $this->category->slug,
                'name' => $this->category->name(),
            ] : null,
            'state' => $this->status->value,
            'state_label' => $this->status->label(),
            'ai_score' => $this->ai_score,
            'budget' => $this->budget_min !== null
                ? ['min' => $this->budget_min, 'max' => $this->budget_max]
                : null,
            'tags' => $this->tags ?? [],
            'cover_url' => $this->coverUrl(),
            'view_count' => $this->view_count,
            'visibility_level' => $this->effectiveVisibilityFor($viewer),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
