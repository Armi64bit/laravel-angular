<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLivreRequest;
use App\Http\Requests\UpdateLivreRequest;
use App\Http\Resources\LivreResource;
use App\Models\Auteur;
use App\Models\Livre;
use App\Support\LivreIdentity;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LivreController extends Controller
{
    // GET /books - List all livres
    public function index(): AnonymousResourceCollection
    {
        return LivreResource::collection(Livre::with('auteur')->latest()->get());
    }

    // POST /books - Add a new livre
    public function store(StoreLivreRequest $request): JsonResponse
    {
        $validated = $request->validated();
        try {
            $livre = DB::transaction(function () use ($validated): Livre {
                $auteur = $this->findOrCreateAuteur($validated['auteur']);

                return $auteur->livres()->create([
                    'titre' => $validated['titre'],
                    'annee' => $validated['annee'],
                ]);
            });
        } catch (QueryException $exception) {
            $this->rethrowUnlessDuplicateBook($exception);
        }
        $livre->load('auteur');

        return (new LivreResource($livre))
            ->additional(['message' => 'Livre créé avec succès'])
            ->response()
            ->setStatusCode(201);
    }

    // GET /books/:id - Show a specific livre
    public function show(Livre $livre): LivreResource
    {
        $livre->load('auteur');

        return new LivreResource($livre);
    }

    // PUT /books/:id - Update an existing livre
    public function update(UpdateLivreRequest $request, Livre $livre): LivreResource
    {
        $validated = $request->validated();
        try {
            DB::transaction(function () use ($validated, $livre): void {
                if (array_key_exists('auteur', $validated)) {
                    $livre->auteur()->associate($this->findOrCreateAuteur($validated['auteur']));
                }

                $livre->fill($validated)->save();
            });
        } catch (QueryException $exception) {
            $this->rethrowUnlessDuplicateBook($exception);
        }

        $livre->load('auteur');

        return new LivreResource($livre);
    }

    // DELETE /books/:id - Delete a livre
    public function destroy(Livre $livre): JsonResponse
    {
        $livre->delete();

        return response()->json([
            'message' => 'Livre supprimé avec succès',
        ], 204);
    }

    private function findOrCreateAuteur(string $nom): Auteur
    {
        $nom = LivreIdentity::clean($nom);

        return Auteur::firstOrCreate(
            ['nom_normalise' => LivreIdentity::normalize($nom)],
            ['nom' => $nom]
        );
    }

    private function rethrowUnlessDuplicateBook(QueryException $exception): never
    {
        $message = strtolower($exception->getMessage());
        $isDuplicate = str_contains($message, 'livres_identite_normalisee_unique')
            || (
                str_contains($message, 'livres.titre_normalise')
                && str_contains($message, 'livres.auteur_id')
                && str_contains($message, 'livres.annee')
            );

        if (! $isDuplicate) {
            throw $exception;
        }

        throw ValidationException::withMessages([
            'titre' => 'Ce livre existe déjà dans la collection.',
        ]);
    }
}
