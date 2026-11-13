<?php

use App\Http\Controllers\OTAClient\AppController;
use App\Http\Controllers\OTAClient\DeviceLinkController;
use App\Http\Controllers\OTAClient\ExpoUpdatesController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
  Route::get('/health', [AppController::class, 'health']);

  # The API key is checked before the device is registered or resolved.
  Route::prefix('app')->middleware(['ota.api_key', 'device'])->group(function () {
    Route::post('/info', [AppController::class, 'info']);
    Route::post('/event', [AppController::class, 'event']);

    Route::prefix('/update')->group(function () {
      Route::get('/bundle/{bundle}', [AppController::class, 'updateBundle']);
      Route::get('/version/{version}', [AppController::class, 'updateVersion']);
    });
  });

  # Links the device to a user (one-time code from the dashboard) for demo access.
  Route::prefix('device')->middleware(['ota.api_key', 'device'])->group(function () {
    Route::post('/info', [DeviceLinkController::class, 'info']);
    Route::post('/link', [DeviceLinkController::class, 'link'])->middleware('throttle:10,1');
    Route::post('/unlink', [DeviceLinkController::class, 'unlink']);
  });

  # Expo Updates protocol (apps built with expo-updates).
  Route::prefix('expo/{package}')->group(function () {
    # The device is optional here (resolved by the controller from Expo-Extra-Params).
    Route::get('/manifest', [ExpoUpdatesController::class, 'manifest'])->middleware('ota.api_key');

    # The temporary signature in the URL is the grant (see ExpoUpdateResponse::assetUrl).
    Route::get('/assets/{asset}', [ExpoUpdatesController::class, 'asset'])
      ->whereNumber('asset')
      ->middleware('signed:relative')
      ->name('ota.expo.asset');
  });
});
