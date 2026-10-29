<?php

use App\Http\Controllers\AuteurController;
use App\Http\Controllers\LivreController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/
// Maps GET, POST, PUT, DELETE for /books
Route::apiResource('books', LivreController::class)
    ->parameters(['books' => 'livre']);
Route::get('/authors/{auteur}/books', [AuteurController::class, 'books'])
    ->whereNumber('auteur');

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
