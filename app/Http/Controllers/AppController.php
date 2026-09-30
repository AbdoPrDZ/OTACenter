<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\AppScreenshot;
use App\Models\DownloadHistory;
use App\Models\Version;
use App\Src\Controller;
use App\Src\ValidationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Validator;

class AppController extends Controller
{

  public function index(Request $request)
  {
    return App::tablingCollect(
      $request,
      selects: ['apps.*'],
      map: fn (App $item) => $item->toArray(),
    );
  }

  public function show(App $app)
  {
    return $this->apiSuccessResponse("App retrieved successfully", [
      'item' => $app->toArray(),
    ]);
  }

  public function download(App $app)
  {
    $user = Auth::user();

    $latest = $app->latest;

    if (!$latest)
      return $this->apiErrorResponse("App latest version not found");

    $file = $latest->file;

    if (!$file)
      return $this->apiErrorResponse("App version file not found");

    DownloadHistory::create([
      'user_id'     => $user->id,
      'target_type' => Version::class,
      'target_id'   => $latest->id,
    ]);

    return response()->file(Storage::disk('public')->path($file->path));
  }

  public function store(Request $request)
  {
    $rules = App::validationRules(ValidationType::Create);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $fields = array_diff(array_keys($rules), ['logo']);
    $app = App::create($request->only($fields));

    if ($request->hasFile('logo')) {
      $logo = $this->moveFile($request, 'logo', 'apps', "app-$app->id-logo-" . time());
      $app->update(['logo_id' => $logo->name]);
    }

    return $this->apiSuccessResponse("App created successfully", [
      'item' => $app->toArray(),
    ]);
  }

  public function update(Request $request, App $app)
  {
    $rules = App::validationRules(ValidationType::Update, $app);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $fields = array_diff(array_keys($rules), ['logo']);
    $app->update($request->only($fields));

    if ($request->hasFile('logo')) {
      $logo = $this->moveFile($request, 'logo', 'apps', "app-$app->id-logo-" . time());
      $app->update(['logo_id' => $logo->name]);
    }

    $latestId = $request->input('latest_id');
    if ($latestId !== null && $latestId !== '') {
      $version = Version::find($latestId);
      if ($version && $version->status !== 'published') {
        $version->update(['status' => 'published']);
      }
    }

    return $this->apiSuccessResponse("App updated successfully", [
      'item' => $app->fresh()->toArray(),
    ]);
  }

  public function destroy(App $app)
  {
    $app->delete();

    return $this->apiSuccessResponse("App deleted successfully");
  }

  public function indexScreenshot(Request $request, App $app)
  {
    return AppScreenshot::tablingCollect(
      $request,
      selects: ['app_screenshots.id', 'file.*'],
      load: ['file'],
      relations: ['file'],
      query: AppScreenshot::query()->where('app_id', $app->id),
    );
  }

  public function storeScreenshot(Request $request, App $app)
  {
    $validator = Validator::make($request->all(), [
      'file' => 'required|file|mimes:jpeg,png,jpg,gif,svg|max:2048',
    ]);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $file = $this->moveFile($request, 'file', 'screenshots', "app-$app->id-screenshot-" . time());

    $screenshot = AppScreenshot::create([
      'app_id' => $app->id,
      'file_id' => $file->name,
    ]);

    return $this->apiSuccessResponse("App screenshot created successfully", [
      'item' => $screenshot->file->url,
    ]);
  }

  public function destroyScreenshot(App $app, AppScreenshot $screenshot)
  {
    if ($screenshot->app_id !== $app->id) {
      return $this->apiErrorResponse("Screenshot does not belong to the specified app");
    }

    $screenshot->delete();

    return $this->apiSuccessResponse("App screenshot deleted successfully");
  }
}
