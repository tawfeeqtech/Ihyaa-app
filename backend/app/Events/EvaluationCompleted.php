<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * حدث حرج: اكتمال تقييم AI — بث فوري لصاحب الفكرة · docs/api/enums.md §2.9.
 * قناة: private-users.{owner_id}
 */
class EvaluationCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Notification $notification) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('private-users.'.$this->notification->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'evaluation.completed';
    }

    public function broadcastWith(): array
    {
        return [
            'notification_id' => $this->notification->id,
            'project_id' => $this->notification->data['project_id'] ?? null,
            'evaluation_id' => $this->notification->data['evaluation_id'] ?? null,
            'ai_score' => $this->notification->data['ai_score'] ?? null,
            'title' => $this->notification->title,
            'url' => $this->notification->data['url'] ?? null,
        ];
    }
}
