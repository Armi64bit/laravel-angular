<?php

namespace App\Http\Controllers;

use App\Models\Livre;
use App\Http\Requests\StoreLivreRequest;
use App\Http\Requests\UpdateLivreRequest;
use App\Http\Resources\LivreResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LivreController extends Controller
{
    // GET /books - List all livres
    public function index(): AnonymousResourceCollection
    {
        return LivreResource::collection(Livre::latest()->get());
    }

    // POST /books - Add a new livre
    public function store(StoreLivreRequest $request): LivreResource
    {
        $livre = Livre::create($request->validated());

        return (new LivreResource($livre))
            ->additional(['message' => 'Livre créé avec succès'])
            ->response()
            ->setStatusCode(201);
    }

    // GET /books/:id - Show a specific livre
    public function show(Livre $livre): LivreResource
    {
        return new LivreResource($livre);
    }

    // PUT /books/:id - Update an existing livre
    public function update(UpdateLivreRequest $request, Livre $livre): LivreResource
    {
        $livre->update($request->validated());

        return new LivreResource($livre);
    }

    // DELETE /books/:id - Delete a livre
    public function destroy(Livre $livre): JsonResponse
    {
        $livre->delete();

        return response()->json([
            'message' => 'Livre supprimé avec succès'
        ], 204);
    }
}