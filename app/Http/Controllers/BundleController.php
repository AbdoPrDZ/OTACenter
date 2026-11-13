<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Bundle;
use App\Models\DownloadHistory;
use App\Models\Log;
use App\Models\Version;
use App\Src\Controller;
use App\Services\Expo\ExpoBundleImporter;
use App\Services\Expo\ExpoImportException;
use App\Services\Releases\ReleasePublisher;
use App\Src\ValidationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Validator;

class BundleController extends Controller
{
  public function index(Request $request, App $app, Version $version)
  {
    return Bundle::tablingCollect(
      $request,
      selects: ['bundles.*'],
      load: ['file'],
      query: Bundle::query()->where('version_id', $version->id),
    );
  }

  public function show(App $app, Version $version, Bundle $bundle)
  {
    return $this->apiSuccessResponse("Bundle retrieved successfully", [
      'item' => $bundle->toArray(),
    ]);
  }

  public function download(App $app, Version $version, Bundle $bundle)
  {
    $user = Auth::user();

    $file = $bundle->file;

    if (!$file)
      return $this->apiErrorResponse("Bundle file not found");

    DownloadHistory::create([
      'user_id'     => $user->id,
      'target_type' => Bundle::class,
      'target_id'   => $bundle->id,
    ]);

    return response()->file(Storage::disk('public')->path($file->path));
  }

  public function store(Request $request, App $app, Version $version)
  {
    $rules = Bundle::validationRules(ValidationType::Create);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    if ($version->isExpo() && strtolower($request->file('file')->getClientOriginalExtension()) !== 'zip')
      return $this->apiSingleErrorResponse('file', 'Upload a zip of the `npx expo export` output for an Expo version.');

    $file = $this->moveFile($request, 'file', 'bundles', "app-$app->id-version-$version->id-bundle-" . time() . "-" . bin2hex(random_bytes(3)));

    $bundle = $version->bundles()->create([
      'name'      => $request->input('name'),
      'changelog' => $request->input('changelog'),
      'status'    => $request->input('status', 'draft'),
      'update_type' => $request->input('update_type') ?: 'optional',
      'is_demo'   => $request->boolean('is_demo'),
      'file_id'   => $file->name,
    ]);

    # An Expo bundle is servable only once its files are listed with their hashes.
    if ($version->isExpo()) {
      try {
        ExpoBundleImporter::import($bundle, $version, Storage::disk('public')->path($file->path), $request->input('runtime_version'));
      } catch (ExpoImportException $e) {
        $bundle->forceDelete();
        Storage::disk('public')->delete($file->path);
        $file->forceDelete();

        return $this->apiSingleErrorResponse($e->field, $e->getMessage(), [], 422);
      }
    }

    Log::record('bundle.created', "Bundle {$bundle->name} created", array_values(array_filter([$bundle, $version, $app, Auth::user()])));

    return $this->apiSuccessResponse("Bundle created successfully", [
      'item' => $bundle->toArray(),
    ]);
  }

  public function update(Request $request, App $app, Version $version, Bundle $bundle)
  {
    $rules = Bundle::validationRules(ValidationType::Update, $bundle);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    # Devices identify an Expo update by its id and file hashes, so its files are
    # immutable: a changed export is a new bundle.
    if ($bundle->isExpo() && $request->hasFile('file'))
      return $this->apiSingleErrorResponse('file', 'The files of an Expo bundle cannot be replaced. Upload a new bundle instead.');

    $fields = array_diff(array_keys($rules), ['file']);
    $bundle->update($request->only($fields));

    if ($request->hasFile('file')) {
      $file = $this->moveFile($request, 'file', 'bundles', "app-$app->id-version-$version->id-bundle-$bundle->id-file-" . time());
      $bundle->update(['file_id' => $file->name]);
    }

    Log::record('bundle.updated', "Bundle {$bundle->name} updated", array_values(array_filter([$bundle, $version, $app, Auth::user()])));

    return $this->apiSuccessResponse("Bundle updated successfully", [
      'item' => $bundle->toArray(),
    ]);
  }

  /**
   * Make this bundle the version's public one (writes `versions.latest_id`,
   * the pointer every device follows). Activating a demo bundle promotes it.
   */
  public function activate(App $app, Version $version, Bundle $bundle)
  {
    ReleasePublisher::publishBundle($version, $bundle);

    return $this->apiSuccessResponse("Bundle activated successfully", [
      'item' => $version->fresh()->toArray(),
    ]);
  }

  /** Publish the bundle to demo-eligible devices only (`versions.demo_latest_id`). */
  public function activateDemo(App $app, Version $version, Bundle $bundle)
  {
    try {
      ReleasePublisher::publishDemoBundle($version, $bundle);
    } catch (\DomainException $e) {
      return $this->apiSingleErrorResponse('bundle', $e->getMessage());
    }

    return $this->apiSuccessResponse("Bundle published as a demo", [
      'item' => $version->fresh()->toArray(),
    ]);
  }

  /** Make a demo bundle the public release for everyone. */
  public function promote(App $app, Version $version, Bundle $bundle)
  {
    if (!$bundle->is_demo)
      return $this->apiSingleErrorResponse('bundle', 'Only a demo bundle can be promoted.');

    ReleasePublisher::publishBundle($version, $bundle);

    return $this->apiSuccessResponse("Bundle promoted to public", [
      'item' => $version->fresh()->toArray(),
    ]);
  }

  /** Stop serving the demo bundle; eligible devices fall back to the public one. */
  public function withdrawDemo(App $app, Version $version)
  {
    if (!ReleasePublisher::withdrawDemoBundle($version))
      return $this->apiSingleErrorResponse('bundle', 'This version has no demo bundle.');

    return $this->apiSuccessResponse("Demo bundle withdrawn", [
      'item' => $version->fresh()->toArray(),
    ]);
  }

  /** Files of an Expo bundle, per platform. */
  public function assets(App $app, Version $version, Bundle $bundle)
  {
    return $this->apiSuccessResponse("Bundle assets retrieved successfully", [
      'items' => $bundle->assets()->orderBy('platform')->orderByDesc('is_launch_asset')->orderBy('id')->get()->toArray(),
    ]);
  }

  public function destroy(App $app, Version $version, Bundle $bundle)
  {
    if ($version->latest_id === $bundle->id) {
      $version->update(['latest_id' => null]);
    }

    if ($version->demo_latest_id === $bundle->id) {
      $version->update(['demo_latest_id' => null]);
    }

    Log::record('bundle.deleted', "Bundle {$bundle->name} deleted", array_values(array_filter([$bundle, $version, $app, Auth::user()])));

    $bundle->delete();

    return $this->apiSuccessResponse("Bundle deleted successfully");
  }
}
