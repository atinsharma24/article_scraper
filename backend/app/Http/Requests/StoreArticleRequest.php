<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreArticleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $baseRules = [
            'type' => ['required', 'in:original,updated'],
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'published_at' => ['nullable', 'date'],
        ];

        if ($this->input('type') === 'original') {
            return $baseRules + [
                'parent_id' => ['nullable'],
                'source_url' => ['required', 'url', 'max:2048'],
                'references' => ['nullable'],
            ];
        }

        return $baseRules + [
            'parent_id' => ['required', 'integer', 'exists:articles,id'],
            'source_url' => ['nullable'],
            'references' => ['required', 'array', 'size:2'],
            'references.*.url' => ['required', 'url', 'max:2048'],
            'references.*.title' => ['nullable', 'string', 'max:255'],
        ];
    }
}
