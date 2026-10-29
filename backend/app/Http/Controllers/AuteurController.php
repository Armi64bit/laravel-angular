<?php

namespace App\Http\Controllers;

use App\Http\Resources\LivreResource;
use App\Models\Auteur;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuteurController extends Controller
{
    public function books(Auteur $auteur): AnonymousResourceCollection
    {
        $livres = $auteur->livres()
            ->with('auteur')
            ->latest()
            ->get();

        return LivreResource::collection($livres);
    }
}
