<?php

namespace App\Enums;

/**
 * حالة طلب الاهتمام — docs/api/enums.md §1.5.
 * pending → accepted (إنشاء PDF وكشف البريد) · pending → rejected (سبب اختياري)
 * pending → cancelled (المستثمر) · accepted → cancelled (المستثمر — يُحذف ملف PDF).
 * قبول/رفض طلب cancelled → خطأ 409 INTEREST_CANCELLED (UC-06 E3).
 */
enum InterestStatus: string
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case REJECTED = 'rejected';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'معلق',
            self::ACCEPTED => 'مقبول',
            self::REJECTED => 'مرفوض',
            self::CANCELLED => 'ملغي',
        };
    }

    public function isActive(): bool
    {
        return $this === self::PENDING || $this === self::ACCEPTED;
    }
}
