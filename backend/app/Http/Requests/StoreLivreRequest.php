<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLivreRequest extends FormRequest
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
            'titre' => [
                'required',
                'string',
                'max:255',
                Rule::unique('livres', 'titre')
                    ->where('auteur', $this->input('auteur'))
                    ->where('annee', $this->input('annee')),
            ],
            'auteur' => ['required', 'string', 'max:255'],
            'annee' => ['required', 'integer', 'min:1000', 'max:' . (date('Y') + 1)],
        ];
    }

    public function messages(): array
    {
        return [
            'titre.unique' => 'Ce livre existe déjà dans la collection.',
        ];
    }
}
