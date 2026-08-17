<?php

namespace App\Models;

use App\Enums\EvaluationStatus;
use App\Enums\ModelUsed;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * سجل تقييمات AI — data-model.md §2 (SRS-DB-05).
 * سجل كامل غير محدود؛ لا حذف تلقائي (الاحتفاظ 12 شهراً مؤجل لـ v1.1).
 */
class Evaluation extends Model
{
    protected $fillable = [
        'project_id',
        'version',
        'status',
        'overall_score',
        'confidence_score',
        'result',
        'model_used',
        'model_name',
        'provider_used',
        'consensus_rounds',
        'retry_count',
        'processing_time_ms',
        'error_log',
        'started_at',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            // status يُحال إلى EvaluationStatus (يضم PENDING منذ موجة طبقة AI).
            'status' => EvaluationStatus::class,
            'model_used' => ModelUsed::class,
            'overall_score' => 'float',
            'confidence_score' => 'float',
            'result' => 'array',
            'error_log' => 'array',
            'consensus_rounds' => 'integer',
            'retry_count' => 'integer',
            'processing_time_ms' => 'integer',
            'version' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    // ——————————————————————— العلاقات ———————————————————————

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function inputSnapshot(): HasOne
    {
        return $this->hasOne(EvaluationInputSnapshot::class, 'evaluation_id');
    }

    public function requestLogs(): HasMany
    {
        return $this->hasMany(AiRequestLog::class, 'evaluation_id');
    }

    public function reportExportLogs(): HasMany
    {
        return $this->hasMany(ReportExportLog::class, 'evaluation_id');
    }

    // ——————————————————————— Scopes ———————————————————————

    /**
     * أحدث تقييم مكتمل فقط (يستبعد partial/failed) — أساس كاش المشروع
     * ai_score/ai_evaluation (data-model.md §7). caller يستدعي first()/get().
     */
    public function scopeLatestCompleted(Builder $query): Builder
    {
        return $query
            ->where('status', EvaluationStatus::COMPLETED->value)
            ->orderByDesc('completed_at')
            ->orderByDesc('id')
            ->limit(1);
    }
}
