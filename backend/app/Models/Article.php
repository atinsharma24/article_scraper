<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Article extends Model
{
    protected $fillable = [
        'type',
        'parent_id',
        'title',
        'slug',
        'content',
        'source_url',
        'published_at',
        'references',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'references' => 'array',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')
            ->where('type', 'updated')
            ->orderByDesc('created_at');
    }
}
