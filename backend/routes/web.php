<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'environment' => config('app.env'),
        'status' => 'ok',
        'endpoints' => [
            'health' => url('/api/health'),
            'articles' => url('/api/articles'),
            'latest_original_needing_update' => url('/api/articles/latest-original-needing-update'),
        ],
    ]);
});
