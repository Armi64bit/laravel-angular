<?php

namespace App\Http\Requests;

use App\Models\Livre;
use App\Support\LivreIdentity;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'titre' => [
                'required',
                'string',
                'max:255',
            ],
            'auteur' => ['required', 'string', 'max:255'],
            'annee' => ['required', 'integer', 'min:1000', 'max:'.(date('Y') + 1)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $isDuplicate = Livre::query()
                ->where('titre_normalise', LivreIdentity::normalize($this->input('titre')))
                ->where('annee', $this->input('annee'))
                ->whereHas(
                    'auteur',
                    fn ($query) => $query->where(
                        'nom_normalise',
                        LivreIdentity::normalize($this->input('auteur'))
                    )
                )
                ->exists();

            if ($isDuplicate) {
                $validator->errors()->add('titre', 'Ce livre existe déjà dans la collection.');
            }
        });
    }
}
