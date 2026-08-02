<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| قنوات البث — Reverb (أحداث حرجة فقط · docs/api/enums.md §2.9)
| قناة خاصة: private-users.{user_id} — مصادقة الاتصال عبر توكن Sanctum.
|--------------------------------------------------------------------------
*/

Broadcast::channel('private-users.{userId}', fn (User $user, int $userId) => (int) $user->id === $userId);
