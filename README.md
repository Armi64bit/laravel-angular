# Bibliothèque — Laravel + Angular

Application de gestion d’une collection de livres, comprenant une API REST Laravel et une interface utilisateur Angular.

## Prérequis

- PHP 8.1+ avec Composer et l’extension PHP SQLite
- Node.js & npm
- Google Chrome (nécessaire pour exécuter les tests Angular en mode headless)

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

L’API est exposée localement sur : `http://127.0.0.1:8000`. Gardez ce terminal ouvert.

> *Note : Si `backend/.env` existe déjà, vérifiez simplement qu'il utilise SQLite et que `DB_DATABASE` pointe vers `database/database.sqlite`.*

## Lancer le frontend

Dans un second terminal, depuis la racine du dépôt :

```powershell
cd frontend
npm ci
npm start
```

L'application est accessible sur : `http://localhost:4200`. 
Par défaut, Angular communique avec l’adresse locale du backend. Pour modifier cette configuration, éditez le fichier `frontend/src/environments/environment.ts`.

## Architecture et API REST

L'application implémente le Modèle Conceptuel de Données (MCD) demandé, séparant les entités **LIVRE** et **AUTEUR** (`Auteur 1 — 0..N Livre`). L'unicité de la combinaison titre/auteur/année est validée côté serveur (renvoie une erreur `422` en cas de doublon).

Conformément au sujet, voici les endpoints exposés par l'application (accessibles via le préfixe standard `/api/`) :

> **Note sur le routage :** J'ai implémenté la logique des routes demandées (`/books`, `/books/:id`) mais en les plaçant sous le préfixe standard `/api/` (ex: `/api/books`). Pour une API REST découplée destinée à être consommée par un framework front-end comme Angular, isoler les endpoints de données sur un préfixe dédié est une bonne pratique essentielle. Cela permet d'éviter les conflits de routage avec l'interface et de gérer proprement la séparation des responsabilités.

| Méthode | Route native | Route absolue | Description |
|---|---|---|---|
| `GET` | `/books` | `/api/books` | Liste paginée et triée (`page`, `per_page`, `sort_by`, `sort_direction`) |
| `POST` | `/books` | `/api/books` | Ajouter un nouveau livre via le formulaire |
| `GET` | `/books/:id` | `/api/books/{id}` | Consulter les détails d'un livre |
| `PUT` | `/books/:id` | `/api/books/{id}` | Modifier un livre existant |
| `DELETE`| `/books/:id` | `/api/books/{id}` | Supprimer un livre |
| `GET` | — | `/api/authors/{id}/books` | Optionnel : Livres associés à un auteur spécifique |

Chaque payload de livre renvoie les propriétés requises : `id`, `titre`, `auteur`, `auteur_id` et `annee`.

### Exemples des endpoints

Les exemples utilisent `http://127.0.0.1:8000` comme adresse du backend et `1` comme identifiant fictif. Les réponses de liste contiennent `data` et `meta` (pagination) ; les réponses de création, consultation et modification contiennent le livre dans `data`.

#### Lister les livres

```http
GET /api/books?page=1&per_page=5&sort_by=titre&sort_direction=asc
```

Réponse `200` : `data` contient les livres de la page actuelle ; `meta` décrit la pagination et le tri. Par exemple :

```json
{
  "data": [
    {
      "id": 1,
      "titre": "Le Petit Prince",
      "auteur": "Antoine de Saint-Exupéry",
      "auteur_id": 1,
      "annee": 1943
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 5,
    "total": 12,
    "last_page": 3,
    "sort_by": "titre",
    "sort_direction": "asc"
  }
}
```

Ici, `data` contient les livres affichés sur cette page, tandis que `meta.total` indique le nombre total de livres dans la collection. Chaque livre contient notamment `id`, `titre`, `auteur`, `auteur_id` et `annee`.

#### Ajouter un livre

```http
POST /api/books
Content-Type: application/json

{
  "titre": "Le Petit Prince",
  "auteur": "Antoine de Saint-Exupéry",
  "annee": 1943
}
```

Réponse `201` : le livre créé est renvoyé dans `data`. Une donnée invalide ou un doublon renvoie `422`.

#### Consulter un livre

```http
GET /api/books/1
```

Réponse `200` : le livre est renvoyé dans `data`. Un identifiant inexistant renvoie `404`.

#### Modifier un livre

```http
PUT /api/books/1
Content-Type: application/json

{
  "titre": "Le Petit Prince (édition illustrée)",
  "auteur": "Antoine de Saint-Exupéry",
  "annee": 1943
}
```

Réponse `200` : le livre modifié est renvoyé dans `data`. Vous pouvez envoyer uniquement les champs à modifier. Une donnée invalide ou un doublon renvoie `422`.

#### Supprimer un livre

```http
DELETE /api/books/1
```

Réponse `204` : suppression réussie, sans contenu dans la réponse.

#### Lister les livres d’un auteur

```http
GET /api/authors/1/books?page=1
```

Réponse `200` : `data` contient les livres de l’auteur et `meta` les informations de pagination. Cette liste affiche 6 livres par page.

### Pagination et tri

La liste générale affiche 5 résultats par page par défaut. Le paramètre `per_page` accepte `5`, `10` ou `20`, et `page` commence à `1`. Le tri par défaut affiche les livres les plus récents en premier. Pour trier, utilisez `sort_by` avec `titre`, `auteur` ou `annee`, et `sort_direction` avec `asc` ou `desc` (par défaut : `asc`).

## Exécuter les tests

Tests Backend (Laravel) :
```powershell
cd backend
php artisan test
```

Tests Frontend (Angular) :
```powershell
cd frontend
npx ng test --watch=false --browsers=ChromeHeadless
```

## Build de Production

Depuis la racine du dépôt :
```powershell
cd frontend
npm run build
```
Le build utilise `environment.prod.ts`. Assurez-vous que votre serveur de production redirige les requêtes `/api` vers le serveur d'API Laravel ou utilise la même origine.
