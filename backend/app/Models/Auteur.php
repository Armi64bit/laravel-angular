<?php

namespace App\Models;

use App\Support\LivreIdentity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Auteur extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
    ];

    public function setNomAttribute(string $value): void
    {
        $this->attributes['nom'] = LivreIdentity::clean($value);
        $this->attributes['nom_normalise'] = LivreIdentity::normalize($value);
    }

    public function livres(): HasMany
    {
        return $this->hasMany(Livre::class);
    }
}
