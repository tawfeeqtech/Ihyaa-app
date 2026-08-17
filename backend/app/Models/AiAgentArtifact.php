<?php

namespace App\Models;

use App\Enums\AnalysisType;
use App\Enums\ModelUsed;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * مخرجات وكيل تحليل المشروع — data-model.md §5 (SRS-DB-09).
 * artifact_data: نصوص وقوالب فقط (SRS-AI-M03). لا updated_at في المخطط.
 */
class AiAgentArtifact extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'analysis_type',
        'artifact_data',
        'version',
        'model_used',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'analysis_type' => AnalysisType::class,
            'artifact_data' => 'array',
            'version' => 'integer',
            'model_used' => ModelUsed::class,
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}
