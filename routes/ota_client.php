<?php

use App\Http\Controllers\OTAClient\AppController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
  Route::get('/health', [AppController::class, 'health']);

  Route::prefix('app')->group(function () {
    Route::post('/info', [AppController::class, 'info']);

    Route::prefix('/update')->group(function () {
      Route::get('/bundle/{bundle}', [AppController::class, 'updateBundle'])->middleware('auth:sanctum');
      Route::get('/version/{version}', [AppController::class, 'updateVersion'])->middleware('auth:sanctum');
    });
  });
});
