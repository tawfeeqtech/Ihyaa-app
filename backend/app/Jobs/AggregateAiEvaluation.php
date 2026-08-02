<?php

namespace App\Jobs;

use App\Enums\EvaluationStatus;
use App\Enums\ModelUsed;
use App\Models\AiEvaluation;
use App\Models\Notification;
use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * تجميع نتائج الأبعاد الخمسة — SRS-5.4.6.3.
 * overall_score = مجموع (درجة البعد × وزنه) · status:
 *  5/5 → completed · 3-4/5 → partial (يُعرض كـ completed مع تحذيرات) · < 3 → failed.
 * عند الاكتمال: تحديث مرآة المشروع + إشعار حرج evaluation.completed (Reverb).
 */
class AggregateAiEvaluation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;

    public int $tries = 2;

    public function __construct(public int $evaluationId) {}

    public function handle(): void
    {
        $evaluation = AiEvaluation::with('project.owner')->find($this->evaluationId);

        if (! $evaluation || $evaluation->status->isTerminal()) {
            return;
        }

        $startedAt = (float) Cache::get("ai_eval:{$this->evaluationId}:started_at", microtime(true));
        $processingTimeMs = (int) round((microtime(true) - $startedAt) * 1000);

        $weights = config('ai.weights');
        $scores = [];
        $gaps = [];
        $recommendations = [];
        $skills = [];
        $warnings = [];
        $confidences = [];
        $completedDims = 0;
        $modelUsed = Cache::get("ai_eval:{$this->evaluationId}:model", 'openai');

        foreach (array_keys($weights) as $dimension) {
            $result = Cache::get("ai_eval:{$this->evaluationId}:{$dimension}");

            if (is_array($result) && isset($result['score']) && $result['score'] !== null) {
                $scores[$dimension] = [
                    'score' => (float) $result['score'],
                    'sub_scores' => $result['sub_scores'] ?? [],
                    'analysis' => $result['analysis'] ?? '',
                ];
                $gaps = array_merge($gaps, $result['gaps'] ?? []);
                $recommendations = array_merge($recommendations, $result['recommendations'] ?? []);
                $skills = array_merge($skills, $result['skills'] ?? []);
                $confidences[] = (float) ($result['confidence'] ?? 0.7);
                $completedDims++;
            } else {
                $warnings[] = [
                    'dimension' => $dimension,
                    'reason' => $result['error'] ?? 'البيانات غير متوفرة',
                ];
            }
        }

        $minForPartial = (int) config('ai.min_dimensions_for_partial', 3);
        $totalDims = count($weights);

        // فشل كامل
        if ($completedDims < $minForPartial) {
            $evaluation->forceFill([
                'status' => EvaluationStatus::FAILED,
                'error_message' => 'اكتمل '.$completedDims.' من '.$totalDims.' أبعاد',
                'warnings' => $warnings,
                'processing_time_ms' => $processingTimeMs,
            ])->save();

            // إشعار مشرف: تنبيه SRS-AI-F04 (غير حرج — عند إعادة التحميل)
            Notification::pushNotification(
                $evaluation->project->user_id,
                'evaluation_failed',
                'فشل تقييم المشروع: '.$evaluation->project->title,
                'اكتمل '.$completedDims.' من '.$totalDims.' أبعاد التقييم.',
                ['project_id' => $evaluation->project_id, 'evaluation_id' => $evaluation->id, 'url' => '/projects/'.$evaluation->project_id],
                false,
            );

            return;
        }

        // الترجيح (Technical 25% · Innovation 25% · Market 20% · Team 15% · Documentation 15%)
        $overall = 0.0;
        foreach ($scores as $dimension => $entry) {
            $overall += $entry['score'] * ($weights[$dimension] ?? 0);
        }
        $overall = round($overall, 2);

        $status = $completedDims === $totalDims
            ? EvaluationStatus::COMPLETED
            : EvaluationStatus::PARTIAL;   // 3-4/5: يُعامل كـ completed للعرض مع تحذيرات

        $evaluation->forceFill([
            'status' => $status,
            'overall_score' => $overall,
            'scores' => $scores,
            'gap_analysis' => [
                'technical' => array_values(array_filter($gaps, fn ($g) => str_contains((string) $g, 'technical') || str_contains((string) $g, 'تقني'))),
                'market' => array_values(array_filter($gaps, fn ($g) => str_contains((string) $g, 'market') || str_contains((string) $g, 'سوق'))),
                'team' => array_values(array_filter($gaps, fn ($g) => str_contains((string) $g, 'team') || str_contains((string) $g, 'فريق'))),
                'documentation' => array_values(array_filter($gaps, fn ($g) => str_contains((string) $g, 'document') || str_contains((string) $g, 'توثيق'))),
                'other' => [],
            ],
            'recommendations' => [
                'immediate' => array_slice($recommendations, 0, 3),
                'short_term' => array_slice($recommendations, 3, 3),
                'long_term' => array_slice($recommendations, 6, 3),
            ],
            'required_skills' => array_values(array_unique($skills)),
            'confidence_score' => $confidences ? round(array_sum($confidences) / count($confidences), 2) : null,
            'warnings' => $warnings,
            'model_used' => ModelUsed::tryFrom((string) $modelUsed) ?? ModelUsed::OPENAI,
            'processing_time_ms' => $processingTimeMs,
        ])->save();

        // مرآة المشروع للعرض والفرز السريع (SRS-F06-04)
        Project::whereKey($evaluation->project_id)->update([
            'ai_score' => $overall,
            'last_evaluation_at' => now(),
        ]);

        Log::info('ai.evaluation_completed', [
            'evaluation_id' => $evaluation->id,
            'project_id' => $evaluation->project_id,
            'overall_score' => $overall,
            'status' => $status->value,
            'processing_time_ms' => $processingTimeMs,
            'model_used' => $modelUsed,
        ]);

        // إشعار حرج + بث Reverb فوري (evaluation.completed)
        Notification::pushNotification(
            $evaluation->project->user_id,
            'evaluation_completed',
            'اكتمل تقييم المشروع: '.$evaluation->project->title,
            'حصل المشروع على '.$overall.' من 100',
            [
                'project_id' => $evaluation->project_id,
                'evaluation_id' => $evaluation->id,
                'ai_score' => $overall,
                'url' => '/projects/'.$evaluation->project_id,
            ],
            true,
        );
    }
}
