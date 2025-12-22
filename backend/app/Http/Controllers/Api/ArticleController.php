<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreArticleRequest;
use App\Http\Requests\UpdateArticleRequest;
use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ArticleController extends Controller
{
    public function exists(Request $request)
    {
        $sourceUrl = $request->query('source_url');
        if (!$sourceUrl) {
            return response()->json([
                'message' => 'source_url is required',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $article = Article::query()->where('source_url', $sourceUrl)->first();
        if (!$article) {
            return response()->json(['exists' => false]);
        }

        return response()->json([
            'exists' => true,
            'id' => $article->id,
            'type' => $article->type,
            'parent_id' => $article->parent_id,
        ]);
    }

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
        $validated = $request->validated();

        try {
            $article = Article::create($validated);
            return response()->json($article, Response::HTTP_CREATED);
        } catch (UniqueConstraintViolationException $e) {
            $sourceUrl = $validated['source_url'] ?? null;
            if ($sourceUrl) {
                $existing = Article::query()->where('source_url', $sourceUrl)->first();

                return response()->json([
                    'message' => 'Article already exists',
                    'article' => $existing,
                ], Response::HTTP_CONFLICT);
            }

            throw $e;
        }
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
