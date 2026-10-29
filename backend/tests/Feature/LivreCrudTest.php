<?php

namespace Tests\Feature;

use App\Models\Auteur;
use App\Models\Livre;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LivreCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_books(): void
    {
        $this->createLivre([
            'titre' => 'Le Petit Prince',
            'auteur' => 'Antoine de Saint-Exupéry',
            'annee' => 1943,
        ]);

        $this->getJson('/api/books')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.titre', 'Le Petit Prince')
            ->assertJsonPath('data.0.auteur', 'Antoine de Saint-Exupéry')
            ->assertJsonPath('data.0.auteur_id', Auteur::first()->id)
            ->assertJsonPath('data.0.annee', 1943);
    }

    public function test_it_eager_loads_authors_when_listing_books(): void
    {
        $this->createLivre([
            'titre' => 'Book One',
            'auteur' => 'Author One',
            'annee' => 2000,
        ]);
        $this->createLivre([
            'titre' => 'Book Two',
            'auteur' => 'Author Two',
            'annee' => 2001,
        ]);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->getJson('/api/books')->assertOk();
        $authorQueries = collect(DB::getQueryLog())
            ->filter(fn (array $query): bool => preg_match('/from\s+["`]?auteurs/i', $query['query']) === 1)
            ->count();

        DB::disableQueryLog();

        $response->assertJsonCount(2, 'data')
            ->assertJsonFragment(['auteur' => 'Author One'])
            ->assertJsonFragment(['auteur' => 'Author Two']);
        $this->assertSame(1, $authorQueries);
    }

    public function test_it_lists_only_books_belonging_to_the_selected_author(): void
    {
        $firstLivre = $this->createLivre([
            'titre' => 'First book',
            'auteur' => 'Shared author',
            'annee' => 2000,
        ]);
        $secondLivre = $this->createLivre([
            'titre' => 'Second book',
            'auteur' => 'Shared author',
            'annee' => 2001,
        ]);
        $this->createLivre([
            'titre' => 'Other book',
            'auteur' => 'Another author',
            'annee' => 2002,
        ]);

        $this->getJson("/api/authors/{$firstLivre->auteur_id}/books")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.auteur_id', $firstLivre->auteur_id)
            ->assertJsonFragment(['titre' => 'First book'])
            ->assertJsonFragment(['titre' => 'Second book'])
            ->assertJsonMissing(['titre' => 'Other book']);

        $this->assertSame($firstLivre->auteur_id, $secondLivre->auteur_id);
    }

    public function test_it_creates_a_book(): void
    {
        $this->postJson('/api/books', [
            'titre' => 'L’Étranger',
            'auteur' => 'Albert Camus',
            'annee' => 1942,
        ])
            ->assertCreated()
            ->assertJsonPath('data.titre', 'L’Étranger')
            ->assertJsonPath('data.auteur', 'Albert Camus')
            ->assertJsonPath('data.annee', 1942);

        $this->assertDatabaseHas('livres', [
            'titre' => 'L’Étranger',
            'auteur_id' => Auteur::where('nom', 'Albert Camus')->value('id'),
            'annee' => 1942,
        ]);
    }

    public function test_it_rejects_invalid_book_data(): void
    {
        $this->postJson('/api/books', [
            'titre' => '',
            'auteur' => 'Albert Camus',
            'annee' => 900,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre', 'annee']);
    }

    public function test_it_rejects_a_duplicate_book(): void
    {
        $this->createLivre([
            'titre' => 'Le Petit Prince',
            'auteur' => 'Antoine de Saint-Exupéry',
            'annee' => 1943,
        ]);

        $this->postJson('/api/books', [
            'titre' => 'Le Petit Prince',
            'auteur' => 'Antoine de Saint-Exupéry',
            'annee' => 1943,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre'])
            ->assertJsonPath('errors.titre.0', 'Ce livre existe déjà dans la collection.');

        $this->assertDatabaseCount('livres', 1);
    }

    public function test_it_rejects_duplicates_with_different_case_or_spacing(): void
    {
        $this->createLivre([
            'titre' => 'Le Petit Prince',
            'auteur' => 'Antoine de Saint-Exupéry',
            'annee' => 1943,
        ]);

        $this->postJson('/api/books', [
            'titre' => '  le   petit  prince ',
            'auteur' => 'ANTOINE  DE SAINT-EXUPÉRY',
            'annee' => 1943,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre'])
            ->assertJsonPath('errors.titre.0', 'Ce livre existe déjà dans la collection.');

        $this->assertDatabaseCount('livres', 1);
        $this->assertDatabaseCount('auteurs', 1);
    }

    public function test_the_database_enforces_book_identity_uniqueness(): void
    {
        $auteur = Auteur::create(['nom' => 'A unique author']);
        $auteur->livres()->create([
            'titre' => '  a   UNIQUE title ',
            'annee' => 2000,
        ]);

        $this->expectException(QueryException::class);

        $auteur->livres()->create([
            'titre' => 'A unique title',
            'annee' => 2000,
        ]);
    }

    public function test_it_updates_a_book(): void
    {
        $livre = $this->createLivre([
            'titre' => 'Old title',
            'auteur' => 'An author',
            'annee' => 1942,
        ]);

        $this->putJson("/api/books/{$livre->id}", [
            'titre' => 'Updated title',
            'auteur' => 'Updated author',
            'annee' => 1943,
        ])
            ->assertOk()
            ->assertJsonPath('data.id', $livre->id)
            ->assertJsonPath('data.titre', 'Updated title')
            ->assertJsonPath('data.auteur', 'Updated author')
            ->assertJsonPath('data.annee', 1943);

        $this->assertDatabaseHas('livres', [
            'id' => $livre->id,
            'titre' => 'Updated title',
            'auteur_id' => Auteur::where('nom', 'Updated author')->value('id'),
            'annee' => 1943,
        ]);
    }

    public function test_it_rejects_updating_a_book_to_an_existing_duplicate(): void
    {
        $existing = $this->createLivre([
            'titre' => 'Existing title',
            'auteur' => 'An author',
            'annee' => 2000,
        ]);
        $livre = $this->createLivre([
            'titre' => 'Different title',
            'auteur' => 'Another author',
            'annee' => 1999,
        ]);

        $this->putJson("/api/books/{$livre->id}", [
            'titre' => $existing->titre,
            'auteur' => $existing->auteur->nom,
            'annee' => $existing->annee,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre']);
    }

    public function test_it_rejects_an_update_to_a_case_or_spacing_variant_of_an_existing_book(): void
    {
        $this->createLivre([
            'titre' => 'Le Petit Prince',
            'auteur' => 'Antoine de Saint-Exupéry',
            'annee' => 1943,
        ]);
        $livre = $this->createLivre([
            'titre' => 'Another title',
            'auteur' => 'Another author',
            'annee' => 1942,
        ]);

        $this->putJson("/api/books/{$livre->id}", [
            'titre' => ' le   petit prince ',
            'auteur' => 'ANTOINE DE SAINT-EXUPÉRY',
            'annee' => 1943,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre']);
    }

    public function test_it_rejects_a_partial_update_that_creates_a_duplicate(): void
    {
        $this->createLivre([
            'titre' => 'Same title',
            'auteur' => 'Same author',
            'annee' => 2000,
        ]);
        $livre = $this->createLivre([
            'titre' => 'Another title',
            'auteur' => 'Same author',
            'annee' => 1999,
        ]);

        $this->patchJson("/api/books/{$livre->id}", [
            'titre' => 'Same title',
            'annee' => 2000,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre']);
    }

    public function test_it_deletes_a_book(): void
    {
        $livre = $this->createLivre([
            'titre' => 'A book to delete',
            'auteur' => 'An author',
            'annee' => 2000,
        ]);

        $this->deleteJson("/api/books/{$livre->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('livres', ['id' => $livre->id]);
    }

    private function createLivre(array $attributes): Livre
    {
        $auteur = Auteur::firstOrCreate(['nom' => $attributes['auteur']]);
        unset($attributes['auteur']);

        return $auteur->livres()->create($attributes);
    }
}
