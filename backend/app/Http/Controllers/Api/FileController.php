<?php

namespace App\Http\Controllers\Api;

use App\Enums\FileType;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Support\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * ملفات المشروع — SRS-API-18 · SRS-F02-02.
 * الحدود: 5 صور × 5MB (jpeg/png/webp) + 3 PDF × 10MB — تُفرض هنا على مستوى الطلب.
 * التخزين: Local Disk فقط (FILESYSTEM_DISK=public) — أسماء عشوائية (حماية المسار SRS-NFR-08).
 */
class FileController
{
    use ApiResponse;

    public const MAX_IMAGES = 5;

    public const MAX_PDFS = 3;

    /** L5 — رفع الملفات (RL-IO-07 · 10/دقيقة) */
    public function upload(Request $request, Project $project): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        $data = $request->validate([
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'mimes:jpeg,png,webp', 'max:5120'],   // 5MB بالكيلوبايت
            'pdfs' => ['nullable', 'array', 'max:'.self::MAX_PDFS],
            'pdfs.*' => ['file', 'mimes:pdf', 'max:10240'],               // 10MB
        ]);

        if (empty($data['images']) && empty($data['pdfs'])) {
            return $this->unprocessable('NO_FILES', __('files.none_provided'));
        }

        // قيود العدد لكل مشروع (ليس فقط لكل طلب)
        $existingImages = $project->files()->where('type', FileType::IMAGE)->count();
        $existingPdfs = $project->files()->where('type', FileType::PDF)->count();

        $newImages = count($data['images'] ?? []);
        $newPdfs = count($data['pdfs'] ?? []);

        if ($existingImages + $newImages > self::MAX_IMAGES) {
            return $this->unprocessable('IMAGE_LIMIT_EXCEEDED', __('files.image_limit', ['max' => self::MAX_IMAGES]));
        }

        if ($existingPdfs + $newPdfs > self::MAX_PDFS) {
            return $this->unprocessable('PDF_LIMIT_EXCEEDED', __('files.pdf_limit', ['max' => self::MAX_PDFS]));
        }

        $hasCover = $project->files()->where('type', FileType::IMAGE)->where('is_cover', true)->exists();
        $maxSort = (int) $project->files()->max('sort_order');

        $created = [];

        // الصور — أول صورة تُرفع تصبح الغلاف افتراضياً (SRS-F02-02)
        foreach ($data['images'] ?? [] as $file) {
            $path = $file->store('projects/'.$project->id, 'public');

            $isCover = ! $hasCover;

            $created[] = $project->files()->create([
                'type' => FileType::IMAGE,
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'is_cover' => $isCover,
                'sort_order' => ++$maxSort,
            ]);

            $hasCover = $hasCover || $isCover;
        }

        // PDFs
        foreach ($data['pdfs'] ?? [] as $file) {
            $path = $file->store('projects/'.$project->id, 'public');

            $created[] = $project->files()->create([
                'type' => FileType::PDF,
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'is_cover' => false,
                'sort_order' => ++$maxSort,
            ]);
        }

        return $this->created(
            collect($created)->map->toArrayApi(),
            __('files.uploaded')
        );
    }

    /** حذف ملف — امتداد مقترح (خارج الـ 49) ضروري لتجربة رفع كاملة */
    public function destroy(Request $request, Project $project, ProjectFile $file): JsonResponse
    {
        if (! $project->isOwner($request->user())) {
            return $this->forbidden();
        }

        if ((int) $file->project_id !== (int) $project->id) {
            return $this->notFound();
        }

        Storage::disk('public')->delete($file->file_path);
        $file->delete();

        return $this->noContent(__('files.deleted'));
    }
}
