<?php

use App\Http\Controllers\AppController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BundleController;
use App\Http\Controllers\DomainController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VersionController;
use App\Models\File;
use Illuminate\Support\Facades\Route;

Route::view('/', 'home')->name('home');

Route::view('docs{any}', 'docs')
  ->where('any', '^(?!api|dashboard|auth).*')
  ->name('docs');

Route::view('register', 'auth')
  ->name('register')
  ->middleware('guest');

Route::view('auth{any}', 'auth')
  ->where('any', "^(?!api|dashboard).*")
  ->name('auth')
  ->middleware('guest');

Route::view('dashboard{any}', 'dashboard')
  ->where('any', "^(?!api|auth).*")
  ->middleware('auth:sanctum')
  ->name('dashboard');

Route::get('files/{file}', function (File $file) {
  return response()->file(Storage::disk('public')->path($file->path));
})->name('files.show');


Route::prefix('api')->group(function () {
  Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/register', [AuthController::class, 'register'])->name('auth.register')->middleware('auth:sanctum', 'ability:user.invite');

    Route::middleware('auth:sanctum')->group(function () {
      Route::get('/me', [AuthController::class, 'me'])->name('auth.me');
      Route::put('/profile', [AuthController::class, 'update'])->name('auth.update');
      Route::delete('/logout', [AuthController::class, 'logout'])->name('auth.logout');
    });
  });

  Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('role')->group(function () {
      Route::get('/', [RoleController::class, 'index'])->middleware('permission:role.view')->name('role.index');

      Route::prefix('/{role}')->whereNumber('role')->group(function () {
        Route::get('/', [RoleController::class, 'show'])->middleware('permission:role.view')->name('role.show');

        Route::prefix('/permission')->group(function () {
          Route::get('/', [PermissionController::class, 'indexByRole'])->middleware('permission:permission.view')->name('role.permission.index');
          Route::post('/{permission}', [PermissionController::class, 'attachToRole'])->middleware('permission:permission.attach')->name('role.permission.attach');
          Route::delete('/{permission}', [PermissionController::class, 'detachFromRole'])->middleware('permission:permission.detach')->name('role.permission.detach');
        });

        Route::prefix('/user')->whereNumber('user')->group(function () {
          Route::get('/', [RoleController::class, 'indexUsers'])->middleware('permission:role.view')->name('role.user.index');
          Route::post('/{user}', [RoleController::class, 'attachToUser'])->middleware('permission:role.attach')->name('role.user.attach');
          Route::delete('/{user}', [RoleController::class, 'detachFromUser'])->middleware('permission:role.detach')->name('role.user.detach');
        });
      });
    });

    Route::get('/permission', [PermissionController::class, 'index'])->middleware('permission:permission.view')->name('permission.index');

    Route::prefix('domain')->group(function () {
      Route::get('/', [DomainController::class, 'index'])->middleware('permission:domain.view')->name('domain.index');
      Route::post('/', [DomainController::class, 'store'])->middleware('permission:domain.create')->name('domain.store');

      Route::prefix('/{domain}')->whereNumber('domain')->group(function () {
        Route::get('/', [DomainController::class, 'show'])->middleware('permission:domain.view')->name('domain.show');
        Route::put('/', [DomainController::class, 'update'])->middleware('permission:domain.update')->name('domain.update');
        Route::delete('/', [DomainController::class, 'destroy'])->middleware('permission:domain.delete')->name('domain.destroy');
      });
    });

    Route::prefix('user')->group(function () {
      Route::get('/', [UserController::class, 'index'])->middleware('permission:user.view')->name('user.index');

      Route::post('/invite', [UserController::class, 'invite'])->middleware('permission:user.invite')->name('user.invite');

      Route::prefix('/{user}')->whereNumber('user')->group(function () {
        Route::get('/', [UserController::class, 'show'])->middleware('permission:user.view')->name('user.show');
        Route::delete('/', [UserController::class, 'destroy'])->middleware('permission:user.delete')->name('user.destroy');

        Route::prefix('/role')->group(function () {
          Route::get('/', [RoleController::class, 'indexByUser'])->middleware('permission:role.view')->name('user.role.index');
          Route::post('/{role}', [RoleController::class, 'attachToUser'])->middleware('permission:role.attach')->name('user.role.attach');
          Route::delete('/{role}', [RoleController::class, 'detachFromUser'])->middleware('permission:role.detach')->name('user.role.detach')->whereNumber('role');
        });

        Route::prefix('/permission')->whereNumber('permission')->group(function () {
          Route::get('/', [PermissionController::class, 'indexByUser'])->middleware('permission:permission.view')->name('user.permission.index');
          Route::post('/{permission}', [PermissionController::class, 'attachToUser'])->middleware('permission:permission.attach')->name('user.permission.attach');
          Route::delete('/{permission}', [PermissionController::class, 'detachFromUser'])->middleware('permission:permission.detach')->name('user.permission.detach')->whereNumber('permission');
        });

        Route::prefix('/domain')->group(function () {
          Route::get('/', [DomainController::class, 'indexByUser'])->middleware('permission:user.view')->name('user.domain.index');
          Route::post('/{domain}', [DomainController::class, 'bindUser'])->middleware('permission:domain.assign_user')->name('user.domain.bind');
          Route::delete('/{domain}', [DomainController::class, 'unbindUser'])->middleware('permission:domain.unassign_user')->name('user.domain.unbind');
        });
      });
    });

    Route::prefix('app')->group(function () {
      Route::get('/', [AppController::class, 'index'])->middleware('permission:app.view')->name('app.index');
      Route::post('/', [AppController::class, 'store'])->middleware('permission:app.create')->name('app.store');

      Route::prefix('/{app}')->whereNumber('app')->group(function () {
        Route::get('/', [AppController::class, 'show'])->middleware('permission:app.view')->name('app.show');
        Route::put('/', [AppController::class, 'update'])->middleware('permission:app.update')->name('app.update');
        Route::delete('/', [AppController::class, 'destroy'])->middleware('permission:app.delete')->name('app.destroy');

        Route::prefix('/screenshot')->group(function () {
          Route::get('/', [AppController::class, 'indexScreenshot'])->middleware('permission:screenshot.view')->name('app.screenshot.index');
          Route::post('/', [AppController::class, 'storeScreenshot'])->middleware('permission:screenshot.create')->name('app.screenshot.store');
          Route::delete('/{screenshot}', [AppController::class, 'destroyScreenshot'])->middleware('permission:screenshot.delete')->name('app.screenshot.destroy')->whereNumber('screenshot');
        });

        Route::prefix('/domain')->group(function () {
          Route::get('/', [DomainController::class, 'indexByApp'])->middleware('permission:app.view')->name('app.domain.index');
          Route::post('/{domain}', [DomainController::class, 'bindApp'])->middleware('permission:domain.assign_app')->name('app.domain.bind');
          Route::delete('/{domain}', [DomainController::class, 'unbindApp'])->middleware('permission:domain.unassign_app')->name('app.domain.unbind');
        });

        Route::prefix('/version')->group(function () {
          Route::get('/', [VersionController::class, 'index'])->middleware('permission:version.view')->name('app.version.index');
          Route::post('/', [VersionController::class, 'store'])->middleware('permission:version.create')->name('app.version.store');

          Route::prefix('/{version}')->whereNumber('version')->middleware('rec.parent:app-apps-id,version-versions-app_id')->group(function () {
            Route::get('/', [VersionController::class, 'show'])->middleware('permission:version.view')->name('app.version.show');
            Route::put('/', [VersionController::class, 'update'])->middleware('permission:version.update')->name('app.version.update');
            Route::delete('/', [VersionController::class, 'destroy'])->middleware('permission:version.delete')->name('app.version.destroy');

            Route::prefix('/bundle')->group(function () {
              Route::get('/', [BundleController::class, 'index'])->middleware('permission:bundle.view')->name('app.version.bundle.index');
              Route::post('/', [BundleController::class, 'store'])->middleware('permission:bundle.create')->name('app.version.bundle.store');

              Route::prefix('/{bundle}')->whereNumber('bundle')->middleware(['permission:bundle.view', 'rec.parent:version-versions-id,bundle-bundles-version_id'])->group(function () {
                Route::get('/', [BundleController::class, 'show'])->middleware('permission:bundle.view')->name('app.version.bundle.show');
                Route::put('/', [BundleController::class, 'update'])->middleware('permission:bundle.update')->name('app.version.bundle.update');
                Route::delete('/', [BundleController::class, 'destroy'])->middleware('permission:bundle.delete')->name('app.version.bundle.destroy');
              });
            });
          });
        });
      });
    });

    Route::prefix('statistics')->group(function () {
      Route::get('/general', [StatisticsController::class, 'general'])->middleware('role:super-admin|admin')->name('statistics.general');
      Route::get('/user/{user}', [StatisticsController::class, 'byUser'])->middleware('role:super-admin|admin')->name('statistics.by_user');
      Route::get('/role/{role}', [StatisticsController::class, 'byRole'])->middleware('role:super-admin|admin')->name('statistics.by_role');
      Route::get('/domain/{domain}', [StatisticsController::class, 'byDomain'])->middleware('role:super-admin|admin')->name('statistics.by_domain');
      Route::get('/app/{app}', [StatisticsController::class, 'byApp'])->middleware('role:super-admin|admin')->name('statistics.by_app');
      Route::get('/version/{version}', [StatisticsController::class, 'byVersion'])->middleware('role:super-admin|admin')->name('statistics.by_version');
    });
  });
});
