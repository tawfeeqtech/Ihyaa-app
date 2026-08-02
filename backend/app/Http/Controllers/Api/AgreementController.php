<?php

namespace App\Http\Controllers\Api;

use App\Models\Interest;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * مستند الاتفاق — SRS-API-27 (RL-SH-04 · 10/دقيقة).
 * الرؤية: طرفا الاتفاق فقط — صاحب المشروع والمستثمر (AgreementPolicy).
 * الطرفان يريان الملف بعد قبول الطلب فقط.
 */
class AgreementController
{
    use ApiResponse;

    /** يُمرَّر كـ {agreement} في المسار — ربط صريح بجدول interests */
    public function show(Request $request, Interest $agreement): BinaryFileResponse
    {
        $user = $request->user();

        $isOwner = (int) $agreement->project->user_id === (int) $user->id;
        $isInvestor = (int) $agreement->investor_id === (int) $user->id;

        // الطرفان فقط (AgreementPolicy)
        if (! $isOwner && ! $isInvestor) {
            abort(403, __('auth.forbidden'));
        }

        // الملف موجود فقط بعد القبول (وليس ملغى)
        if ($agreement->status->value !== 'accepted' || ! $agreement->agreement_pdf_path) {
            abort(404, __('errors.not_found'));
        }

        $path = Storage::disk('public')->path($agreement->agreement_pdf_path);

        if (! file_exists($path)) {
            abort(404, __('errors.not_found'));
        }

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="agreement-'.$agreement->id.'.pdf"',
        ]);
    }
}
