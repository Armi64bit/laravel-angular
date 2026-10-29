<?php

namespace App\Http\Controllers;

use App\Http\Resources\LivreResource;
use App\Models\Auteur;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuteurController extends Controller
{
    private const BOOKS_PER_PAGE = 6;

    public function books(Request $request, Auteur $auteur): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $page = (int) ($validated['page'] ?? 1);
        $query = $auteur->livres()
            ->with('auteur')
            ->latest()
            ->orderByDesc('livres.id');
        $livres = $query->paginate(self::BOOKS_PER_PAGE, ['livres.*'], 'page', $page);

        if ($page > $livres->lastPage()) {
            $livres = $query->paginate(self::BOOKS_PER_PAGE, ['livres.*'], 'page', $livres->lastPage());
        }

        return LivreResource::collection($livres);
    }
}
