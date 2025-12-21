<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateArticleRequest extends FormRequest
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
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255'],
            'content' => ['sometimes', 'required', 'string'],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'source_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'references' => ['sometimes', 'nullable', 'array'],
            'references.*.url' => ['required_with:references', 'url', 'max:2048'],
            'references.*.title' => ['nullable', 'string', 'max:255'],
        ];
    }
}
