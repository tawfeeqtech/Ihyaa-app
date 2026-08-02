<?php

namespace App\Models;

use App\Events\EvaluationCompleted;
use App\Events\InterestCreated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * إشعار داخل التطبيق — SRS-F09.
 * is_critical = true → بث فوري عبر Reverb (interest.created | evaluation.completed).
 * أنواع: interest_received · evaluation_completed (حرجة) · interest_accepted · interest_rejected
 *        interest_cancelled · project_updated · evaluation_failed
 */
class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'body',
        'data',
        'is_critical',
        'read_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'is_critical' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    /**
     * إنشاء إشعار موحّد + بث فوري للحرج.
     * الاسم pushNotification — لأن Model::push() محجوز لـ Eloquent (حفظ العلاقات).
     */
    public static function pushNotification(
        int $userId,
        string $type,
        string $title,
        ?string $body = null,
        array $data = [],
        bool $isCritical = false,
    ): self {
        $notification = static::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'is_critical' => $isCritical,
        ]);

        if ($isCritical) {
            $notification->broadcastCritical();
        }

        return $notification;
    }

    /** بث الحدث الحرج عبر القناة الخاصة private-users.{user_id} */
    public function broadcastCritical(): void
    {
        $eventClass = match ($this->type) {
            'interest_received' => InterestCreated::class,
            'evaluation_completed' => EvaluationCompleted::class,
            default => null,
        };

        if ($eventClass !== null) {
            broadcast(new $eventClass($this));
        }
    }
}
