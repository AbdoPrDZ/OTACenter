<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Bundle;
use App\Models\DownloadHistory;
use App\Models\Version;
use App\Src\Controller;
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

    $file = $this->moveFile($request, 'file', 'bundles', "app-$app->id-version-$version->id-bundle-" . time());

    $bundle = $version->bundles()->create([
      'name'      => $request->input('name'),
      'changelog' => $request->input('changelog'),
      'status'    => $request->input('status', 'draft'),
      'file_id'   => $file->name,
    ]);

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

    $fields = array_diff(array_keys($rules), ['file']);
    $bundle->update($request->only($fields));

    if ($request->hasFile('file')) {
      $file = $this->moveFile($request, 'file', 'bundles', "app-$app->id-version-$version->id-bundle-$bundle->id-file-" . time());
      $bundle->update(['file_id' => $file->name]);
    }

    return $this->apiSuccessResponse("Bundle updated successfully", [
      'item' => $bundle->toArray(),
    ]);
  }

  public function destroy(App $app, Version $version, Bundle $bundle)
  {
    if ($version->latest_id === $bundle->id) {
      $version->update(['latest_id' => null]);
    }

    $bundle->delete();

    return $this->apiSuccessResponse("Bundle deleted successfully");
  }
}
