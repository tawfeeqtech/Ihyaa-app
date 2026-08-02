<?php

namespace App\Http\Controllers\Api;

use App\Models\AiEvaluation;
use App\Models\Project;
use App\Services\AgreementPdfService;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * تصدير تقرير التقييم PDF — SRS-API-48 · RL-AI-02 (10/دقيقة).
 * Owner دائماً / Investor بعد اتفاق مقبول فقط (مستوى إفصاح 3).
 */
class ReportController
{
    use ApiResponse;

    public function export(Request $request, Project $project, AiEvaluation $evaluation): Response
    {
        $user = $request->user();

        if (! $project->isOwner($user) && ! ($user && $project->hasAcceptedInterestFrom($user))) {
            abort(403, __('auth.forbidden'));
        }

        if ((int) $evaluation->project_id !== (int) $project->id) {
            abort(404, __('errors.not_found'));
        }

        $lines = [
            'Ihyaa - AI Evaluation Report',
            '============================',
            'Project: '.$evaluation->project->title,
            'Version: '.$evaluation->version,
            'Date: '.$evaluation->created_at?->format('Y-m-d H:i'),
            'Status: '.$evaluation->status->value,
            '',
            'Overall Score: '.($evaluation->overall_score ?? '-').' / 100',
            'Confidence: '.($evaluation->confidence_score ?? '-'),
            'Model: '.($evaluation->model_used?->value ?? '-'),
            'Processing time: '.($evaluation->processing_time_ms ?? '-').' ms',
            '',
        ];

        foreach (($evaluation->scores ?? []) as $dimension => $entry) {
            $lines[] = strtoupper($dimension).': '.($entry['score'] ?? '-');
            foreach (($entry['sub_scores'] ?? []) as $criterion => $score) {
                $lines[] = '  - '.$criterion.': '.$score;
            }
        }

        if ($evaluation->gap_analysis) {
            $lines[] = '';
            $lines[] = 'Gap Analysis:';
            foreach (array_filter((array) $evaluation->gap_analysis) as $area => $items) {
                foreach ((array) $items as $item) {
                    $lines[] = '  - ['.$area.'] '.$item;
                }
            }
        }

        if ($evaluation->recommendations) {
            $lines[] = '';
            $lines[] = 'Recommendations:';
            foreach (array_filter((array) $evaluation->recommendations) as $horizon => $items) {
                foreach ((array) $items as $item) {
                    $lines[] = '  - ['.$horizon.'] '.$item;
                }
            }
        }

        $pdf = app(AgreementPdfService::class)->buildPdf(implode("\n", $lines));

        $fileName = 'report-project-'.$project->id.'-v'.$evaluation->version.'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }
}
