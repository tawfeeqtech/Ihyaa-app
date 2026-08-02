<?php

namespace App\Jobs;

use App\Services\AiGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Sub-Agent تقييم بُعد واحد — يعمل بالتوازي (5 Jobs لكل تقييم).
 * Retry: 3 محاولات (فوري ← 3 ثوانٍ ← 9 ثوانٍ — enums.md §2.4) · مهلة 45 ثانية.
 * النتيجة تُخزَّن في Cache (Redis) ثم يُستدعى التجميع عند اكتمال آخر بُعد.
 */
class EvaluateDimension implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 50;                  // مهلة Sub-Agent 45s + هامش HTTP

    public int $tries = 3;                     // Retry Logic: فوري ← 3s ← 9s

    public array $backoff = [0, 3, 9];

    public function __construct(
        public int $evaluationId,
        public string $dimension,
        public array $projectData,
    ) {}

    public function handle(AiGateway $ai): void
    {
        $result = $ai->evaluateDimension($this->dimension, $this->projectData);

        // تخزين النتيجة — Cache (Redis في الإنتاج) بصلاحية 30 دقيقة
        Cache::put("ai_eval:{$this->evaluationId}:{$this->dimension}", $result, 1800);
        Cache::put("ai_eval:{$this->evaluationId}:model", $result['model_used'] ?? 'openai', 1800);

        $this->finalize();
    }

    /**
     * بعد استنفاد المحاولات — نسجّل الفشل ونكمل التجميع (نتيجة جزئية عند 3/5 أبعاد).
     */
    public function failed(\Throwable $e): void
    {
        Log::error('ai.dimension_failed', [
            'evaluation_id' => $this->evaluationId,
            'dimension' => $this->dimension,
            'error' => $e->getMessage(),
        ]);

        Cache::put("ai_eval:{$this->evaluationId}:{$this->dimension}", [
            'score' => null,
            'error' => $e->getMessage(),
        ], 1800);

        $this->finalize();
    }

    /** آخر بُعد يكمل → تشغيل التجميع */
    protected function finalize(): void
    {
        $finished = Cache::increment("ai_eval:{$this->evaluationId}:finished");

        if ($finished >= count(config('ai.weights'))) {
            AggregateAiEvaluation::dispatch($this->evaluationId)
                ->onQueue('ai');
        }
    }
}
