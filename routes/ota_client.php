<?php

use App\Http\Controllers\OTAClient\AppController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
  Route::get('/health', [AppController::class, 'health']);

  # The API key is checked before the device is registered or resolved.
  Route::prefix('app')->middleware(['ota.api_key', 'device'])->group(function () {
    Route::post('/info', [AppController::class, 'info']);

    Route::prefix('/update')->group(function () {
      Route::get('/bundle/{bundle}', [AppController::class, 'updateBundle']);
      Route::get('/version/{version}', [AppController::class, 'updateVersion']);
    });
  });
});
