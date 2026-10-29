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
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LivreController extends Controller
{
    // GET /books - List all livres
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', Rule::in([5, 10, 20])],
            'sort_by' => ['sometimes', 'nullable', Rule::in(['titre', 'auteur', 'annee'])],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
        ]);
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 5);
        $sortBy = $validated['sort_by'] ?? null;
        $sortDirection = $validated['sort_direction'] ?? 'asc';
        $query = Livre::query()->with('auteur');

        if ($sortBy === 'titre') {
            $query->orderBy('livres.titre_normalise', $sortDirection);
        } elseif ($sortBy === 'auteur') {
            $query->orderBy(
                Auteur::query()
                    ->select('nom_normalise')
                    ->whereColumn('auteurs.id', 'livres.auteur_id'),
                $sortDirection
            );
        } elseif ($sortBy === 'annee') {
            $query->orderBy('livres.annee', $sortDirection);
        } else {
            $query->latest('livres.created_at');
        }

        $query->orderBy('livres.id', $sortBy === null ? 'desc' : 'asc');
        $books = $query->paginate($perPage, ['livres.*'], 'page', $page);

        if ($page > $books->lastPage()) {
            $books = $query->paginate($perPage, ['livres.*'], 'page', $books->lastPage());
        }

        return LivreResource::collection($books)->additional([
            'meta' => [
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
        ]);
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
