<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auteurs', function (Blueprint $table) {
            $table->id();
            $table->string('nom')->unique();
            $table->timestamps();
        });

        Schema::table('livres', function (Blueprint $table) {
            $table->unsignedBigInteger('auteur_id')->nullable()->after('auteur');
            $table->foreign('auteur_id')->references('id')->on('auteurs')->cascadeOnDelete();
        });

        DB::table('livres')
            ->select(['id', 'auteur'])
            ->orderBy('id')
            ->chunkById(100, function ($livres): void {
                foreach ($livres as $livre) {
                    $auteurId = DB::table('auteurs')
                        ->where('nom', $livre->auteur)
                        ->value('id');

                    if ($auteurId === null) {
                        $now = now();
                        $auteurId = DB::table('auteurs')->insertGetId([
                            'nom' => $livre->auteur,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }

                    DB::table('livres')
                        ->where('id', $livre->id)
                        ->update(['auteur_id' => $auteurId]);
                }
            });

        Schema::table('livres', function (Blueprint $table) {
            $table->dropUnique('livres_titre_auteur_annee_unique');
            $table->dropColumn('auteur');
        });

        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildBooksTable(true);
        } else {
            $this->setColumnNotNull('auteur_id');
            Schema::table('livres', function (Blueprint $table) {
                $table->unique(
                    ['titre', 'auteur_id', 'annee'],
                    'livres_titre_auteur_id_annee_unique'
                );
            });
        }
    }

    public function down(): void
    {
        Schema::table('livres', function (Blueprint $table) {
            $table->dropUnique('livres_titre_auteur_id_annee_unique');
            $table->string('auteur')->nullable()->after('titre');
        });

        DB::table('livres')
            ->select(['id', 'auteur_id'])
            ->orderBy('id')
            ->chunkById(100, function ($livres): void {
                foreach ($livres as $livre) {
                    $nom = DB::table('auteurs')
                        ->where('id', $livre->auteur_id)
                        ->value('nom');

                    DB::table('livres')
                        ->where('id', $livre->id)
                        ->update(['auteur' => $nom]);
                }
            });

        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildBooksTable(false);
        } else {
            $this->setColumnNotNull('auteur');
            Schema::table('livres', function (Blueprint $table) {
                $table->dropForeign(['auteur_id']);
                $table->dropColumn('auteur_id');
                $table->unique(
                    ['titre', 'auteur', 'annee'],
                    'livres_titre_auteur_annee_unique'
                );
            });
        }

        Schema::dropIfExists('auteurs');
    }

    private function setColumnNotNull(string $column): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE livres MODIFY {$column} ".($column === 'auteur_id' ? 'BIGINT UNSIGNED' : 'VARCHAR(255)').' NOT NULL');

            return;
        }

        DB::statement("ALTER TABLE livres ALTER COLUMN {$column} SET NOT NULL");
    }

    private function rebuildBooksTable(bool $normalized): void
    {
        Schema::create('livres_rebuild', function (Blueprint $table) use ($normalized): void {
            $table->id();
            $table->string('titre');
            if ($normalized) {
                $table->foreignId('auteur_id')->constrained('auteurs')->cascadeOnDelete();
            } else {
                $table->string('auteur');
            }
            $table->integer('annee');
            $table->timestamps();
            $table->unique(
                ['titre', $normalized ? 'auteur_id' : 'auteur', 'annee'],
                $normalized
                    ? 'livres_titre_auteur_id_annee_unique'
                    : 'livres_titre_auteur_annee_unique'
            );
        });

        $columns = $normalized
            ? ['id', 'titre', 'auteur_id', 'annee', 'created_at', 'updated_at']
            : ['id', 'titre', 'auteur', 'annee', 'created_at', 'updated_at'];
        DB::table('livres_rebuild')->insertUsing($columns, DB::table('livres')->select($columns));

        Schema::drop('livres');
        Schema::rename('livres_rebuild', 'livres');
    }
};
