<?php

use App\Http\Controllers\Api\ArticleController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
	return response()->json(['status' => 'ok']);
});

Route::get('/articles/exists', [ArticleController::class, 'exists']);
Route::get('/articles/latest-original-needing-update', [ArticleController::class, 'latestOriginalNeedingUpdate']);
Route::apiResource('articles', ArticleController::class);
