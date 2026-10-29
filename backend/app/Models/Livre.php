<?php

namespace App\Models;

use App\Support\LivreIdentity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Livre extends Model
{
    use HasFactory;

    protected $fillable = [
        'titre',
        'auteur_id',
        'annee',
    ];

    public function setTitreAttribute(string $value): void
    {
        $this->attributes['titre'] = LivreIdentity::clean($value);
        $this->attributes['titre_normalise'] = LivreIdentity::normalize($value);
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(Auteur::class);
    }
}
