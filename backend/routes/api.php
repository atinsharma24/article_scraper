<?php

use App\Http\Controllers\Api\ArticleController;
use Illuminate\Support\Facades\Route;

Route::get('/articles/latest-original-needing-update', [ArticleController::class, 'latestOriginalNeedingUpdate']);
Route::apiResource('articles', ArticleController::class);
