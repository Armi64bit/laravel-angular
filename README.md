# Bibliothèque — Laravel + Angular

Application de gestion d’une collection de livres, avec une API Laravel et une interface Angular.

## Prérequis

- PHP 8.1 ou plus récent, Composer et l’extension PHP SQLite
- Node.js et npm
- Google Chrome (nécessaire pour les tests Angular en mode headless)

## Lancer le backend

Dans PowerShell, depuis la racine du dépôt :

```powershell
cd backend
composer install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path database/database.sqlite)) { New-Item -ItemType File -Path database/database.sqlite }
php artisan key:generate
php artisan migrate
php artisan serve
```

L’API est disponible à `http://127.0.0.1:8000/api`. Gardez ce terminal ouvert.

> Si `backend/.env` existe déjà, ne le remplacez pas : vérifiez qu’il utilise SQLite et que `DB_DATABASE` pointe vers `database/database.sqlite`.

## Lancer le frontend

Dans un second terminal, depuis la racine du dépôt :

```powershell
cd frontend
npm ci
npm start
```

Ouvrez `http://localhost:4200`. En développement, Angular utilise l’API `http://127.0.0.1:8000/api`. Pour une autre adresse locale, modifiez `frontend/src/environments/environment.ts`.

## Architecture et API

Angular consomme une API REST Laravel. Les livres sont associés à un auteur (`auteurs 1 — n livres`) ; l’identité normalisée titre/auteur/année est protégée contre les doublons.

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/books` | Liste paginée et triée (`page`, `per_page` : 5, 10 ou 20 ; `sort_by` : `titre`, `auteur`, `annee` ; `sort_direction` : `asc` ou `desc`) |
| `POST` | `/api/books` | Créer un livre |
| `GET` | `/api/books/{id}` | Consulter un livre |
| `PUT` / `PATCH` | `/api/books/{id}` | Modifier un livre |
| `DELETE` | `/api/books/{id}` | Supprimer un livre |
| `GET` | `/api/authors/{id}/books` | Livres d’un auteur, 6 par page (`page`) |

Les réponses de liste contiennent `data` et `meta` (pagination et, pour la liste générale, tri). Chaque livre expose notamment `id`, `titre`, `auteur`, `auteur_id` et `annee`. Les données invalides ou les doublons renvoient une erreur de validation `422`.

## Exécuter les tests

Tests backend, depuis `backend` :

```powershell
php artisan test
```

Tests frontend, depuis `frontend` :

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

## Build de production

Depuis `frontend` :

```powershell
npm run build
```

Le build de production utilise `frontend/src/environments/environment.prod.ts`, configuré avec `/api`. Le serveur de production doit servir l’API sur la même origine ou rediriger `/api` vers le backend.
