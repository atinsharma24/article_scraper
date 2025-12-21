<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreArticleRequest;
use App\Http\Requests\UpdateArticleRequest;
use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Response;

class ArticleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Article::query();

        if (request()->filled('type')) {
            $query->where('type', request('type'));
        }

        if (request()->filled('parent_id')) {
            $query->where('parent_id', request('parent_id'));
        }

        $perPage = (int) request('per_page', 10);
        $perPage = max(1, min(100, $perPage));

        return $query
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreArticleRequest $request)
    {
        $article = Article::create($request->validated());
        return response()->json($article, Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $article = Article::query()->with('updates')->findOrFail($id);
        return response()->json($article);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateArticleRequest $request, string $id)
    {
        $article = Article::findOrFail($id);
        $article->fill($request->validated());
        $article->save();
        return response()->json($article);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $article = Article::findOrFail($id);
        $article->delete();
        return response()->noContent();
    }

    public function latestOriginalNeedingUpdate()
    {
        $article = Article::query()
            ->where('type', 'original')
            ->whereDoesntHave('updates')
            ->orderByDesc('created_at')
            ->first();

        if (!$article) {
            return response()->noContent();
        }

        return response()->json($article);
    }
}
