<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\ProjectFile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * الحذف النهائي لمشاريع سلة المهملات بعد 30 يوماً (SRS-F02-06).
 * الأمر المجدول اليومي: projects:purge-trash
 */
class PurgeTrashedProjects extends Command
{
    protected $signature = 'projects:purge-trash';

    protected $description = 'حذف نهائي للمشاريع التي تجاوزت 30 يوماً في سلة المهملات (مع ملفاتها)';

    public function handle(): int
    {
        $expired = Project::onlyTrashed()
            ->where('deleted_at', '<', now()->subDays(Project::TRASH_RECOVERY_DAYS))
            ->get();

        $deleted = 0;

        foreach ($expired as $project) {
            // حذف الملفات من Local Disk
            $project->files()->withTrashed()->each(function (ProjectFile $file) {
                Storage::disk('public')->delete($file->file_path);
            });

            $project->forceDelete();
            $deleted++;
        }

        $this->info("Purged {$deleted} trashed project(s).");

        return self::SUCCESS;
    }
}
