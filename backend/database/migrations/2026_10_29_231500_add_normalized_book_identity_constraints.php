<?php

use App\Support\LivreIdentity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureNoExistingDuplicateBooks();

        Schema::table('auteurs', function (Blueprint $table): void {
            $table->string('nom_normalise')->default('');
        });

        Schema::table('livres', function (Blueprint $table): void {
            $table->string('titre_normalise')->default('');
        });

        DB::table('auteurs')->orderBy('id')->chunkById(500, function ($auteurs): void {
            foreach ($auteurs as $auteur) {
                DB::table('auteurs')
                    ->where('id', $auteur->id)
                    ->update(['nom_normalise' => LivreIdentity::normalize($auteur->nom)]);
            }
        });

        DB::table('livres')->orderBy('id')->chunkById(500, function ($livres): void {
            foreach ($livres as $livre) {
                DB::table('livres')
                    ->where('id', $livre->id)
                    ->update(['titre_normalise' => LivreIdentity::normalize($livre->titre)]);
            }
        });

        Schema::table('auteurs', function (Blueprint $table): void {
            $table->unique('nom_normalise', 'auteurs_nom_normalise_unique');
        });

        Schema::table('livres', function (Blueprint $table): void {
            $table->unique(
                ['titre_normalise', 'auteur_id', 'annee'],
                'livres_identite_normalisee_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('livres', function (Blueprint $table): void {
            $table->dropUnique('livres_identite_normalisee_unique');
            $table->dropColumn('titre_normalise');
        });

        Schema::table('auteurs', function (Blueprint $table): void {
            $table->dropUnique('auteurs_nom_normalise_unique');
            $table->dropColumn('nom_normalise');
        });
    }

    private function ensureNoExistingDuplicateBooks(): void
    {
        $livres = DB::table('livres')
            ->join('auteurs', 'auteurs.id', '=', 'livres.auteur_id')
            ->select(['livres.id', 'livres.titre', 'livres.annee', 'auteurs.nom'])
            ->orderBy('livres.id')
            ->get();
        $identities = [];

        foreach ($livres as $livre) {
            $identity = implode("\0", [
                LivreIdentity::normalize($livre->titre),
                LivreIdentity::normalize($livre->nom),
                (string) $livre->annee,
            ]);
            $identities[$identity][] = $livre->id;
        }

        $duplicates = array_filter($identities, static fn (array $ids): bool => count($ids) > 1);
        if ($duplicates !== []) {
            $ids = implode(', ', array_merge(...array_values($duplicates)));
            throw new RuntimeException(
                "Cannot add normalized book uniqueness while duplicate books already exist. Resolve livre IDs: {$ids}."
            );
        }

        $authors = DB::table('auteurs')->orderBy('id')->get(['id', 'nom']);
        $normalizedNames = [];

        foreach ($authors as $author) {
            $name = LivreIdentity::normalize($author->nom);
            if (isset($normalizedNames[$name])) {
                throw new RuntimeException(
                    "Cannot add normalized author uniqueness while author IDs {$normalizedNames[$name]} and {$author->id} have the same name."
                );
            }

            $normalizedNames[$name] = $author->id;
        }
    }
};
