<?php

namespace App\Http\Requests;

use App\Models\Livre;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateLivreRequest extends FormRequest
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
            'titre' => ['sometimes', 'required', 'string', 'max:255'],
            'auteur' => ['sometimes', 'required', 'string', 'max:255'],
            'annee' => ['sometimes', 'required', 'integer', 'min:1000', 'max:' . (date('Y') + 1)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $livre = $this->route('livre');
            if ($validator->errors()->isNotEmpty() || !$livre instanceof Livre) {
                return;
            }

            $isDuplicate = Livre::query()
                ->where('titre', $this->input('titre', $livre->titre))
                ->where('auteur', $this->input('auteur', $livre->auteur))
                ->where('annee', $this->input('annee', $livre->annee))
                ->whereKeyNot($livre->id)
                ->exists();

            if ($isDuplicate) {
                $validator->errors()->add('titre', 'Un autre livre avec ce titre, cet auteur et cette année existe déjà.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'titre.unique' => 'Un autre livre avec ce titre, cet auteur et cette année existe déjà.',
        ];
    }
}
