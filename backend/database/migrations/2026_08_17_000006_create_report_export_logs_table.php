<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تدقيق طلبات تصدير تقارير PDF — data-model.md §6 (US-028-S5).
     * بلا FK صريح في المخطط (مطابق §6) — فهارس فقط.
     */
    public function up(): void
    {
        Schema::create('report_export_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evaluation_id');
            $table->unsignedBigInteger('user_id');             // من طلب التصدير

            $table->enum('access_level', ['owner', 'post_agreement', 'admin']);
            $table->enum('language', ['ar', 'en']);
            $table->enum('status', ['success', 'failed', 'denied']);

            $table->timestamp('created_at')->useCurrent();

            // ——— فهارس §6 ———
            $table->index(['evaluation_id', 'created_at'], 'idx_export_evaluation');
            $table->index(['user_id', 'created_at'], 'idx_export_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_export_logs');
    }
};
