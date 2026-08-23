<?php

namespace App\Services\Project;

use App\Models\Project;
use App\Models\User;

/**
 * T160 — منطق أعمال المشاريع (SRS-API-15..17 · SRS-F02).
 *
 * يتولّى الإنشاء والتحديث + استنتاج مزوّد الفيديو (T133) + كشف التغييرات
 * الجوهرية التي تستدعي اقتراح إعادة تقييم يدوية (SRS-F04-02).
 * (التحقق من الصحة في StoreProjectRequest/UpdateProjectRequest — T163.)
 */
class ProjectService
{
    /**
     * الحقول الجوهرية — تغيّرها يستدعي اقتراح إعادة تقييم (contract §PUT / SRS-F04-02).
     * ملاحظة: العقد يضيف video_url أيضاً — يُفصَّل في T168/T166.
     */
    public const SIGNIFICANT_FIELDS = ['description', 'tags', 'github_url', 'status'];

    /** إنشاء مشروع جديد لصاحب الفكرة (SRS-API-15). */
    public function create(User $user, array $data): Project
    {
        return $user->projects()->create($this->applyVideoProviderInference($data));
    }

    /**
     * تحديث المشروع (SRS-API-16).
     *
     * @return array{project: Project, significant_changes: bool}
     *         significant_changes: تغيّرت الحقول الجوهرية → اقتراح إعادة تقييم يدوية
     *         (لا تلقائية إطلاقاً — SRS-F04-02).
     */
    public function update(Project $project, array $data): array
    {
        $original = $project->only(self::SIGNIFICANT_FIELDS);

        $project->update($this->applyVideoProviderInference($data));

        $significantChanged = collect($original)->some(
            fn ($value, $key) => json_encode($value) !== json_encode($project->{$key})
        );

        return [
            'project' => $project,
            'significant_changes' => $significantChanged,
        ];
    }

    /**
     * T133 — استنتاج مزوّد الفيديو من رابط YouTube/Vimeo عند الحفظ إن غاب.
     */
    public function inferVideoProvider(?string $videoUrl): ?string
    {
        if (! $videoUrl) {
            return null;
        }

        if (preg_match('/(?:youtube\.com|youtu\.be)/i', $videoUrl)) {
            return 'youtube';
        }

        if (str_contains(strtolower($videoUrl), 'vimeo.com')) {
            return 'vimeo';
        }

        return null;
    }

    /**
     * تطبيق استنتاج video_provider على البيانات المُدخَلة.
     * يُستنتج فقط عند وجود video_url في الطلب؛ وإن غاب الحقلان معاً
     * (تحديث جزئي) لا يُلمس video_provider المخزّن.
     */
    protected function applyVideoProviderInference(array $data): array
    {
        if (array_key_exists('video_url', $data)) {
            $data['video_provider'] = $data['video_provider']
                ?? $this->inferVideoProvider($data['video_url']);
        }

        return $data;
    }
}
