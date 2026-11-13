<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Bundle;
use App\Models\DownloadHistory;
use App\Models\Log;
use App\Models\Version;
use App\Src\Controller;
use App\Services\Releases\ReleasePublisher;
use App\Src\ValidationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class VersionController extends Controller
{

  public function index(Request $request, App $app)
  {
    return Version::tablingCollect(
      $request,
      selects: ['versions.*'],
      query: Version::query()->where('app_id', $app->id),
    );
  }

  public function show(App $app, Version $version)
  {
    return $this->apiSuccessResponse("Version retrieved successfully", [
      'item' => $version->toArray(),
    ]);
  }

  public function download(App $app, Version $version)
  {
    $user = Auth::user();

    $file = $version->file;

    if (!$file)
      return $this->apiErrorResponse("App version file not found");

    DownloadHistory::create([
      'user_id'     => $user->id,
      'target_type' => Version::class,
      'target_id'   => $version->id,
    ]);

    return response()->file(Storage::disk('public')->path($file->path));
  }

  public function store(Request $request, App $app)
  {
    $rules = Version::validationRules(ValidationType::Create);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $fields = array_diff(array_keys($rules), ['file']);

    # An Expo build may ship through a store, so it can have no installer.
    $file = $request->hasFile('file')
      ? $this->moveFile($request, 'file', 'versions', "app-$app->id-version-" . time() . "-" . bin2hex(random_bytes(3)))
      : null;

    $data = $request->only($fields);
    $data['status'] = $data['status'] ?? 'draft';
    $data['client_type'] = $data['client_type'] ?? Version::CLIENT_OTA;

    $version = $app->versions()->create([
      ...$data,
      'file_id' => $file?->name,
    ]);

    Log::record('version.created', "Version {$version->name} created for {$app->name}", array_values(array_filter([$version, $app, Auth::user()])));

    return $this->apiSuccessResponse("Version created successfully", [
      'item' => $version->toArray(),
    ]);
  }

  public function update(Request $request, App $app, Version $version)
  {
    $rules = Version::validationRules(ValidationType::Update, $version);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $fields = array_diff(array_keys($rules), ['file']);
    $version->update($request->only($fields));

    if ($request->hasFile('file')) {
      $file = $this->moveFile($request, 'file', 'versions', "app-$app->id-version-$version->id-file-" . time());
      $version->update(['file_id' => $file->name]);
    }

    $latestId = $request->input('latest_id');
    if ($latestId !== null && $latestId !== '') {
      $bundle = Bundle::find($latestId);
      if ($bundle && $bundle->status !== 'published') {
        $bundle->update(['status' => 'published']);
      }

      # Making a demo bundle the public one promotes it.
      if ($bundle) ReleasePublisher::bundlePublished($version->fresh(), $bundle->fresh());
    }

    Log::record('version.updated', "Version {$version->name} updated", array_values(array_filter([$version, $app, Auth::user()])));

    return $this->apiSuccessResponse("Version updated successfully", [
      'item' => $version->fresh()->toArray(),
    ]);
  }

  /** Make this version the app's public one (`apps.latest_id`). Activating a demo version promotes it. */
  public function activate(App $app, Version $version)
  {
    ReleasePublisher::publishVersion($app, $version);

    return $this->apiSuccessResponse("Version activated successfully", [
      'item' => $app->fresh()->toArray(),
    ]);
  }

  /** Publish the version to demo-eligible devices only (`apps.demo_latest_id`). */
  public function activateDemo(App $app, Version $version)
  {
    try {
      ReleasePublisher::publishDemoVersion($app, $version);
    } catch (\DomainException $e) {
      return $this->apiSingleErrorResponse('version', $e->getMessage());
    }

    return $this->apiSuccessResponse("Version published as a demo", [
      'item' => $app->fresh()->toArray(),
    ]);
  }

  /** Make a demo version the public release for everyone. */
  public function promote(App $app, Version $version)
  {
    if (!$version->is_demo)
      return $this->apiSingleErrorResponse('version', 'Only a demo version can be promoted.');

    ReleasePublisher::publishVersion($app, $version);

    return $this->apiSuccessResponse("Version promoted to public", [
      'item' => $app->fresh()->toArray(),
    ]);
  }

  /** Stop serving the demo version; eligible devices fall back to the public one. */
  public function withdrawDemo(App $app)
  {
    if (!ReleasePublisher::withdrawDemoVersion($app))
      return $this->apiSingleErrorResponse('version', 'This app has no demo version.');

    return $this->apiSuccessResponse("Demo version withdrawn", [
      'item' => $app->fresh()->toArray(),
    ]);
  }

  public function destroy(App $app, Version $version)
  {
    Log::record('version.deleted', "Version {$version->name} deleted", array_values(array_filter([$version, $app, Auth::user()])));

    $version->delete();

    return $this->apiSuccessResponse("Version deleted successfully");
  }
}
