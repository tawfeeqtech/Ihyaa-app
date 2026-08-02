<?php

namespace App\Models;

use App\Enums\FileType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectFile extends Model
{
    protected $fillable = [
        'project_id',
        'type',
        'file_path',
        'original_name',
        'mime_type',
        'file_size',
        'is_cover',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => FileType::class,
            'is_cover' => 'boolean',
            'file_size' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function url(): string
    {
        return asset('storage/'.$this->file_path);
    }

    public function toArrayApi(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'url' => $this->url(),
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'is_cover' => $this->is_cover,
            'sort_order' => $this->sort_order,
        ];
    }
}
