<?php

namespace App\Models;

use App\Enums\EvaluationStatus;
use App\Enums\ModelUsed;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiEvaluation extends Model
{
    protected $fillable = [
        'project_id',
        'version',
        'status',
        'overall_score',
        'scores',
        'gap_analysis',
        'recommendations',
        'required_skills',
        'confidence_score',
        'warnings',
        'model_used',
        'processing_time_ms',
        'error_message',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => EvaluationStatus::class,
            'model_used' => ModelUsed::class,
            'overall_score' => 'float',
            'confidence_score' => 'float',
            'scores' => 'array',
            'gap_analysis' => 'array',
            'recommendations' => 'array',
            'required_skills' => 'array',
            'warnings' => 'array',
            'processing_time_ms' => 'integer',
            'version' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** آخر 5 مكتملة للمقارنة (SRS-DB-05) */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->whereIn('status', [EvaluationStatus::COMPLETED, EvaluationStatus::PARTIAL]);
    }

    /** ملخص التقرير للعرض وفق مستوى الإفصاح */
    public function toReportArray(string $access = 'full'): array
    {
        $report = [
            'id' => $this->id,
            'version' => $this->version,
            'status' => $this->status->value,
            'overall_score' => $this->overall_score,
            'confidence_score' => $this->confidence_score,
            'model_used' => $this->model_used?->value,
            'processing_time_ms' => $this->processing_time_ms,
            'evaluated_at' => $this->created_at?->toISOString(),
        ];

        // level 2+ : الأبعاد الخمسة + بيانات الرسم الراداري
        if (in_array($access, ['dimensions', 'full'], true)) {
            $report['scores'] = $this->scores;
        }

        // level 3 (مالك أو مستثمر بعد اتفاق): كل شيء
        if ($access === 'full') {
            $report['gap_analysis'] = $this->gap_analysis;
            $report['recommendations'] = $this->recommendations;
            $report['required_skills'] = $this->required_skills;
            $report['warnings'] = $this->warnings;
        }

        return $report;
    }
}
