<?php

use App\Support\LivreIdentity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        $books = [
            ['Les Misérables', 'Victor Hugo', 1862],
            ['Notre-Dame de Paris', 'Victor Hugo', 1831],
            ['Les Travailleurs de la mer', 'Victor Hugo', 1866],
            ['L’Homme qui rit', 'Victor Hugo', 1869],
            ['Quatrevingt-treize', 'Victor Hugo', 1874],
            ['Les Contemplations', 'Victor Hugo', 1856],
            ['Germinal', 'Émile Zola', 1885],
            ['L’Assommoir', 'Émile Zola', 1877],
            ['Nana', 'Émile Zola', 1880],
            ['Au Bonheur des Dames', 'Émile Zola', 1883],
            ['La Bête humaine', 'Émile Zola', 1890],
            ['Thérèse Raquin', 'Émile Zola', 1867],
            ['Vingt mille lieues sous les mers', 'Jules Verne', 1870],
            ['Le Tour du monde en quatre-vingts jours', 'Jules Verne', 1873],
            ['Voyage au centre de la Terre', 'Jules Verne', 1864],
            ['De la Terre à la Lune', 'Jules Verne', 1865],
            ['L’Île mystérieuse', 'Jules Verne', 1875],
            ['Michel Strogoff', 'Jules Verne', 1876],
            ['Les Trois Mousquetaires', 'Alexandre Dumas', 1844],
            ['Le Comte de Monte-Cristo', 'Alexandre Dumas', 1844],
            ['Vingt ans après', 'Alexandre Dumas', 1845],
            ['La Reine Margot', 'Alexandre Dumas', 1845],
            ['Le Vicomte de Bragelonne', 'Alexandre Dumas', 1847],
            ['La Dame de Monsoreau', 'Alexandre Dumas', 1846],
            ['Du côté de chez Swann', 'Marcel Proust', 1913],
            ['À l’ombre des jeunes filles en fleurs', 'Marcel Proust', 1919],
            ['Le Côté de Guermantes', 'Marcel Proust', 1920],
            ['Sodome et Gomorrhe', 'Marcel Proust', 1921],
            ['La Prisonnière', 'Marcel Proust', 1923],
            ['Albertine disparue', 'Marcel Proust', 1925]
        ];

        DB::transaction(function () use ($books): void {
            foreach ($books as [$title, $author, $year]) {
                $normalizedAuthor = LivreIdentity::normalize($author);
                $authorId = DB::table('auteurs')
                    ->where('nom_normalise', $normalizedAuthor)
                    ->value('id');

                if ($authorId === null) {
                    $now = now();
                    $authorId = DB::table('auteurs')->insertGetId([
                        'nom' => LivreIdentity::clean($author),
                        'nom_normalise' => $normalizedAuthor,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                $normalizedTitle = LivreIdentity::normalize($title);
                $exists = DB::table('livres')
                    ->where('titre_normalise', $normalizedTitle)
                    ->where('auteur_id', $authorId)
                    ->where('annee', $year)
                    ->exists();

                if (!$exists) {
                    $now = now();
                    DB::table('livres')->insert([
                        'titre' => LivreIdentity::clean($title),
                        'titre_normalise' => $normalizedTitle,
                        'auteur_id' => $authorId,
                        'annee' => $year,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        // Keep these baseline records on rollback; they may have been edited since installation.
    }
};
