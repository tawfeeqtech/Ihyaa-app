<?php

namespace App\Http\Controllers\Api;

use App\Enums\InterestStatus;
use App\Enums\InterestType;
use App\Models\Interest;
use App\Models\Notification;
use App\Models\Project;
use App\Services\AgreementPdfService;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * طلبات الاهتمام — SRS-API-22..27 · SRS-F08.
 * store (Investor) · received (صاحب الفكرة) · sent (المستثمر)
 * accept/reject (صاحب المشروع فقط) · cancel (المستثمر — UC-07 E2).
 */
class InterestController
{
    use ApiResponse;

    // ——————————————————————— إرسال طلب (RL-INV-04 · 10/دقيقة) ———————————————————————

    public function store(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'interest_type' => ['required', Rule::enum(InterestType::class)],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $investor = $request->user();

        // لا يمكن إبداء الاهتمام بمشروعه الخاص
        if ($project->isOwner($investor)) {
            return $this->error('OWN_PROJECT', __('interests.own_project'), 422);
        }

        // منع الطلب النشط المكرر (SRS-F08-03) — فحص ودّي قبل خطأ الـ DB
        $active = $project->interests()
            ->where('investor_id', $investor->id)
            ->whereIn('status', [InterestStatus::PENDING, InterestStatus::ACCEPTED])
            ->exists();

        if ($active) {
            return $this->conflict('INTEREST_ALREADY_EXISTS', __('interests.duplicate'));
        }

        $interest = $project->interests()->create([
            'investor_id' => $investor->id,
            'interest_type' => $data['interest_type'],
            'message' => $data['message'] ?? null,
            'status' => InterestStatus::PENDING,
        ]);

        // إشعار حرج + بث Reverb فوري (interest.created — < 5 ثوانٍ)
        Notification::pushNotification(
            $project->user_id,
            'interest_received',
            __('notifications.interest_received_title', ['project' => $project->title]),
            $investor->name.' — '.$data['interest_type'],
            [
                'project_id' => $project->id,
                'interest_id' => $interest->id,
                'url' => '/projects/'.$project->id,
            ],
            true,
        );

        return $this->created($interest->toApiArray(), __('interests.sent'));
    }

    // ——————————————————————— طلبات مستلمة (صاحب الفكرة — RL-SH-01 · 30/دقيقة) ———————————————————————

    public function received(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isIdeaOwner()) {
            return $this->forbidden();
        }

        $request->validate([
            'status' => ['nullable', Rule::enum(InterestStatus::class)],
        ]);

        $interests = $user->interestsReceived()
            ->with(['project.category', 'investor'])
            ->when($request->input('status'), fn ($q, $status) => $q->where('interests.status', $status))
            ->orderByDesc('interests.created_at')
            ->paginate(20);

        $includeContacts = $request->input('status') === InterestStatus::ACCEPTED->value;

        return $this->paginated(
            $interests,
            $interests->map(fn (Interest $i) => $i->toApiArray($includeContacts))
        );
    }

    // ——————————————————————— طلبات مرسلة (المستثمر — RL-INV-05 · 60/دقيقة) ———————————————————————

    public function sent(Request $request): JsonResponse
    {
        $interests = $request->user()->interestsSent()
            ->with(['project.category'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return $this->paginated(
            $interests,
            $interests->map(fn (Interest $i) => array_merge($i->toApiArray(), [
                'project' => $i->project?->toCardArray(),
            ]))
        );
    }

    // ——————————————————————— قبول (صاحب المشروع — RL-SH-02 · 10/دقيقة) ———————————————————————

    public function accept(Request $request, Interest $interest): JsonResponse
    {
        $user = $request->user();

        if (! $interest->project->isOwner($user)) {
            return $this->forbidden();
        }

        if ($interest->status === InterestStatus::CANCELLED) {
            return $this->conflict('INTEREST_CANCELLED', __('interests.cancelled_error')); // UC-06 E3
        }

        if ($interest->status !== InterestStatus::PENDING) {
            return $this->unprocessable('INVALID_INTEREST_STATUS', __('interests.invalid_status'));
        }

        // إنشاء مستند الاتفاق PDF (أسماء الطرفين — < 5 ثوانٍ · SRS-F08-05)
        $pdfPath = app(AgreementPdfService::class)->generate($interest);

        $interest->forceFill([
            'status' => InterestStatus::ACCEPTED,
            'agreement_pdf_path' => $pdfPath,
            'accepted_at' => now(),
        ])->save();

        // إشعار غير حرج للمستثمر (عند إعادة التحميل)
        Notification::pushNotification(
            $interest->investor_id,
            'interest_accepted',
            __('notifications.interest_accepted_title', ['project' => $interest->project->title]),
            null,
            ['project_id' => $interest->project_id, 'interest_id' => $interest->id, 'url' => '/projects/'.$interest->project_id],
            false,
        );

        return $this->success($interest->fresh()->toApiArray(includeContacts: true), __('interests.accepted'));
    }

    // ——————————————————————— رفض (صاحب المشروع — RL-SH-03 · 10/دقيقة) ———————————————————————

    public function reject(Request $request, Interest $interest): JsonResponse
    {
        $user = $request->user();

        if (! $interest->project->isOwner($user)) {
            return $this->forbidden();
        }

        if ($interest->status === InterestStatus::CANCELLED) {
            return $this->conflict('INTEREST_CANCELLED', __('interests.cancelled_error')); // UC-06 E3
        }

        if ($interest->status !== InterestStatus::PENDING) {
            return $this->unprocessable('INVALID_INTEREST_STATUS', __('interests.invalid_status'));
        }

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $interest->reject($data['reason'] ?? null);

        Notification::pushNotification(
            $interest->investor_id,
            'interest_rejected',
            __('notifications.interest_rejected_title', ['project' => $interest->project->title]),
            $data['reason'] ?? null,
            ['project_id' => $interest->project_id, 'interest_id' => $interest->id, 'url' => '/projects/'.$interest->project_id],
            false,
        );

        return $this->success($interest->fresh()->toApiArray(), __('interests.rejected'));
    }

    /**
     * إلغاء (المستثمر — pending أو accepted) — UC-07 E2.
     * بعد القبول: يُحذف ملف PDF ويُخفى البريد.
     */
    public function cancel(Request $request, Interest $interest): JsonResponse
    {
        $user = $request->user();

        if ((int) $interest->investor_id !== (int) $user->id) {
            return $this->forbidden();
        }

        if (! $interest->status->isActive()) {
            return $this->unprocessable('INVALID_INTEREST_STATUS', __('interests.invalid_status'));
        }

        // إلغاء بعد القبول → حذف ملف PDF (UC-07 E2)
        if ($interest->status === InterestStatus::ACCEPTED && $interest->agreement_pdf_path) {
            Storage::disk('public')->delete($interest->agreement_pdf_path);
            $interest->forceFill(['agreement_pdf_path' => null])->save();
        }

        $interest->cancel();

        Notification::pushNotification(
            $interest->project->user_id,
            'interest_cancelled',
            __('notifications.interest_cancelled_title', ['project' => $interest->project->title]),
            null,
            ['project_id' => $interest->project_id, 'interest_id' => $interest->id, 'url' => '/projects/'.$interest->project_id],
            false,
        );

        return $this->success($interest->fresh()->toApiArray(), __('interests.cancelled'));
    }
}
