<?php

namespace Tests\Feature;

use App\Models\Livre;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LivreCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_books(): void
    {
        Livre::create([
            'titre' => 'Le Petit Prince',
            'auteur' => 'Antoine de Saint-Exupéry',
            'annee' => 1943,
        ]);

        $this->getJson('/api/books')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.titre', 'Le Petit Prince')
            ->assertJsonPath('data.0.auteur', 'Antoine de Saint-Exupéry')
            ->assertJsonPath('data.0.annee', 1943);
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
            'auteur' => 'Albert Camus',
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
        Livre::create([
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

    public function test_it_updates_a_book(): void
    {
        $livre = Livre::create([
            'titre' => 'Old title',
            'auteur' => 'An author',
            'annee' => 1942,
        ]);

        $this->putJson("/api/books/{$livre->id}", [
            'titre' => 'Updated title',
            'auteur' => 'An author',
            'annee' => 1943,
        ])
            ->assertOk()
            ->assertJsonPath('data.id', $livre->id)
            ->assertJsonPath('data.titre', 'Updated title')
            ->assertJsonPath('data.annee', 1943);

        $this->assertDatabaseHas('livres', [
            'id' => $livre->id,
            'titre' => 'Updated title',
            'annee' => 1943,
        ]);
    }

    public function test_it_rejects_updating_a_book_to_an_existing_duplicate(): void
    {
        $existing = Livre::create([
        'titre' => 'Existing title',
        'auteur' => 'An author',
        'annee' => 2000,
        ]);
        $livre = Livre::create([
        'titre' => 'Different title',
        'auteur' => 'Another author',
        'annee' => 1999,
        ]);

        $this->putJson("/api/books/{$livre->id}", [
        'titre' => $existing->titre,
        'auteur' => $existing->auteur,
        'annee' => $existing->annee,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['titre']);
    }

    public function test_it_rejects_a_partial_update_that_creates_a_duplicate(): void
    {
        Livre::create([
        'titre' => 'Same title',
        'auteur' => 'Same author',
        'annee' => 2000,
        ]);
        $livre = Livre::create([
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
        $livre = Livre::create([
            'titre' => 'A book to delete',
            'auteur' => 'An author',
            'annee' => 2000,
        ]);

        $this->deleteJson("/api/books/{$livre->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('livres', ['id' => $livre->id]);
    }
}
