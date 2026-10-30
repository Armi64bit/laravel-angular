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
            ->assertJsonPath('data.0.annee', 1943)
            ->assertJsonPath('meta.per_page', 5);
    }

    public function test_it_paginates_and_sorts_books_on_the_server(): void
    {
        foreach (range(1, 7) as $number) {
            $this->createLivre([
                'titre' => sprintf('Book %02d', $number),
                'auteur' => 'Test Author',
                'annee' => 2000 + $number,
            ]);
        }

        $this->getJson('/api/books?page=2&per_page=5&sort_by=titre&sort_direction=desc')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.total', 7)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.from', 6)
            ->assertJsonPath('meta.to', 7)
            ->assertJsonPath('meta.sort_by', 'titre')
            ->assertJsonPath('meta.sort_direction', 'desc')
            ->assertJsonPath('data.0.titre', 'Book 02')
            ->assertJsonPath('data.1.titre', 'Book 01');

        $this->getJson('/api/books?page=1&per_page=5&sort_by=annee&sort_direction=asc')
            ->assertOk()
            ->assertJsonPath('data.0.annee', 2001)
            ->assertJsonPath('data.4.annee', 2005);

        $this->createLivre([
            'titre' => 'Z Author Book',
            'auteur' => 'Zed Author',
            'annee' => 1990,
        ]);
        $this->createLivre([
            'titre' => 'A Author Book',
            'auteur' => 'Alpha Author',
            'annee' => 1991,
        ]);

        $this->getJson('/api/books?per_page=20&sort_by=auteur&sort_direction=asc')
            ->assertOk()
            ->assertJsonPath('data.0.titre', 'A Author Book')
            ->assertJsonPath('data.1.titre', 'Book 01');
    }

    public function test_it_clamps_a_page_beyond_the_last_page(): void
    {
        foreach (range(1, 6) as $number) {
            $this->createLivre([
                'titre' => "Book {$number}",
                'auteur' => 'Test Author',
                'annee' => 2000 + $number,
            ]);
        }

        $this->getJson('/api/books?page=3&per_page=5')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.total', 6)
            ->assertJsonCount(1, 'data');
    }

    public function test_it_rejects_unsupported_book_list_parameters(): void
    {
        $this->getJson('/api/books?per_page=15&sort_by=invalid&sort_direction=sideways')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page', 'sort_by', 'sort_direction']);
    }

    public function test_it_rejects_non_positive_or_non_integer_book_list_pages(): void
    {
        $this->getJson('/api/books?page=0')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);

        $this->getJson('/api/books?page=not-a-number')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);
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
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 1)
            ->assertJsonPath('meta.per_page', 6)
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.auteur_id', $firstLivre->auteur_id)
            ->assertJsonFragment(['titre' => 'First book'])
            ->assertJsonFragment(['titre' => 'Second book'])
            ->assertJsonMissing(['titre' => 'Other book']);

        $this->assertSame($firstLivre->auteur_id, $secondLivre->auteur_id);
    }

    public function test_it_paginates_books_for_an_author(): void
    {
        $firstLivre = null;
        foreach (range(1, 8) as $number) {
            $livre = $this->createLivre([
                'titre' => "Author book {$number}",
                'auteur' => 'Prolific author',
                'annee' => 2000 + $number,
            ]);
            $firstLivre ??= $livre;
        }

        $this->getJson("/api/authors/{$firstLivre->auteur_id}/books?page=2")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.per_page', 6)
            ->assertJsonPath('meta.total', 8)
            ->assertJsonPath('data.0.titre', 'Author book 2')
            ->assertJsonPath('data.1.titre', 'Author book 1');
    }

    public function test_it_clamps_an_author_books_page_beyond_the_last_page(): void
    {
        $firstLivre = null;
        foreach (range(1, 7) as $number) {
            $livre = $this->createLivre([
                'titre' => "Author book {$number}",
                'auteur' => 'Prolific author',
                'annee' => 2000 + $number,
            ]);
            $firstLivre ??= $livre;
        }

        $this->getJson("/api/authors/{$firstLivre->auteur_id}/books?page=99")
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 7)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.titre', 'Author book 1');
    }

    public function test_it_rejects_invalid_author_books_page_numbers(): void
    {
        $auteur = Auteur::create(['nom' => 'Test author']);

        $this->getJson("/api/authors/{$auteur->id}/books?page=0")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);

        $this->getJson("/api/authors/{$auteur->id}/books?page=invalid")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page']);
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

    public function test_it_does_not_create_a_book_or_author_when_required_data_is_invalid(): void
    {
        $this->postJson('/api/books', [
            'titre' => str_repeat('T', 256),
            'auteur' => 'New author',
            'annee' => date('Y') + 2,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre', 'annee']);

        $this->assertDatabaseCount('livres', 0);
        $this->assertDatabaseCount('auteurs', 0);
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

    public function test_it_allows_updating_a_book_without_matching_itself_as_a_duplicate(): void
    {
        $livre = $this->createLivre([
            'titre' => 'Le Petit Prince',
            'auteur' => 'Antoine de Saint-Exupéry',
            'annee' => 1943,
        ]);

        $this->putJson("/api/books/{$livre->id}", [
            'titre' => '  le   petit prince ',
            'auteur' => ' ANTOINE DE SAINT-EXUPÉRY ',
            'annee' => 1943,
        ])
            ->assertOk()
            ->assertJsonPath('data.id', $livre->id)
            ->assertJsonPath('data.titre', 'le petit prince')
            ->assertJsonPath('data.auteur', 'Antoine de Saint-Exupéry');

        $this->assertDatabaseCount('livres', 1);
        $this->assertDatabaseCount('auteurs', 1);
    }

    public function test_it_rejects_invalid_update_data_without_changing_the_book(): void
    {
        $livre = $this->createLivre([
            'titre' => 'Original title',
            'auteur' => 'Original author',
            'annee' => 2000,
        ]);

        $this->putJson("/api/books/{$livre->id}", [
            'titre' => '',
            'auteur' => str_repeat('A', 256),
            'annee' => 'not-a-year',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre', 'auteur', 'annee']);

        $this->assertDatabaseHas('livres', [
            'id' => $livre->id,
            'titre' => 'Original title',
            'auteur_id' => $livre->auteur_id,
            'annee' => 2000,
        ]);
        $this->assertDatabaseCount('auteurs', 1);
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
