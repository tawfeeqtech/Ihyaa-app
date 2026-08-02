<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * الإشعارات — SRS-API-28..31 · RL-SH-05..08.
 * جرس الإشعارات: آخر 5 + عدادات — is_critical يُبث عبر Reverb فوراً.
 */
class NotificationController
{
    use ApiResponse;

    /** RL-SH-05 · 30/دقيقة */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()
            ->orderByDesc('created_at')
            ->paginate(20);

        $data = $notifications->map(fn (Notification $n) => [
            'id' => $n->id,
            'type' => $n->type,
            'title' => $n->title,
            'body' => $n->body,
            'data' => $n->data,
            'is_critical' => $n->is_critical,
            'read_at' => $n->read_at?->toISOString(),
            'created_at' => $n->created_at?->toISOString(),
        ]);

        return $this->paginated($notifications, $data, 'ok', [
            'unread_count' => $request->user()->notifications()->unread()->count(),
        ]);
    }

    /** RL-SH-06 · 30/دقيقة */
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            return $this->forbidden();
        }

        $notification->forceFill(['read_at' => now()])->save();

        return $this->success(['read_at' => $notification->read_at?->toISOString()]);
    }

    /** RL-SH-07 · 10/دقيقة */
    public function markAllRead(Request $request): JsonResponse
    {
        $updated = $request->user()->notifications()->unread()->update(['read_at' => now()]);

        return $this->success(['marked' => $updated]);
    }

    /** RL-SH-08 · 30/دقيقة */
    public function unreadCount(Request $request): JsonResponse
    {
        return $this->success([
            'unread_count' => $request->user()->notifications()->unread()->count(),
        ]);
    }
}
