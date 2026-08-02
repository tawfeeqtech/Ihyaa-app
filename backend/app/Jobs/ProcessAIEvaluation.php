<?php

namespace App\Jobs;

use App\Enums\EvaluationStatus;
use App\Models\AiEvaluation;
use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

/**
 * معالجة تقييم AI — SRS-F03.
 * ينشئ سجل التقييم (version يتزايد) ويوزّع 5 Sub-Agents متوازية (بُعد لكل Job).
 * ShouldBeUnique يمنع تقييمين متزامنين لنفس المشروع (SRS-DB-04).
 */
class ProcessAIEvaluation implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 200;                 // سقف المعالجة المطلق 180s + هامش

    public int $tries = 1;                     // لا إعادة كاملة — إعادة المحاولة عبر Retry endpoint

    public int $uniqueFor = 600;               // قفل المشروع 10 دقائق

    public function __construct(
        public Project $project,
    ) {}

    public function uniqueId(): string
    {
        return 'evaluation:'.$this->project->id;
    }

    public function handle(): void
    {
        $project = $this->project->load(['category', 'owner', 'files']);

        $version = (int) AiEvaluation::where('project_id', $project->id)->max('version') + 1;

        $evaluation = AiEvaluation::create([
            'project_id' => $project->id,
            'version' => $version,
            'status' => EvaluationStatus::PROCESSING,
        ]);

        // لقطة بيانات المشروع — تُمرَّر للـ Sub-Agents (مدخلات التقييم SRS-5.4.6.2)
        $projectData = [
            'id' => $project->id,
            'title' => $project->title,
            'description' => $project->description,
            'category' => $project->category?->name_en ?? null,
            'tags' => $project->tags ?? [],
            'github_url' => $project->github_url,
            'budget_min' => $project->budget_min,
            'budget_max' => $project->budget_max,
            'owner_university' => $project->owner?->university,
            'owner_major' => $project->owner?->major,
            'team_size' => 1, // فريق MVP من الملف الشخصي — يُوسَّع لاحقاً
            'file_count' => $project->files->count(),
        ];

        // توقيت البداية للمعالجة المتوازية
        Cache::put("ai_eval:{$evaluation->id}:started_at", microtime(true), 1800);
        Cache::put("ai_eval:{$evaluation->id}:finished", 0, 1800);

        // 5 Sub-Agents متوازية — كل Job يقيس بُعداً واحداً (مهلة 45 ثانية)
        foreach (array_keys(config('ai.weights')) as $dimension) {
            EvaluateDimension::dispatch($evaluation->id, $dimension, $projectData)
                ->onQueue('ai');
        }
    }
}
