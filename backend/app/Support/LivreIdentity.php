<?php

namespace App\Support;

class LivreIdentity
{
    public static function clean(string $value): string
    {
        $cleaned = preg_replace('/\s+/u', ' ', trim($value));

        return $cleaned ?? trim($value);
    }

    public static function normalize(string $value): string
    {
        return mb_strtolower(self::clean($value), 'UTF-8');
    }
}
