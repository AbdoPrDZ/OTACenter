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
    $file = $this->moveFile($request, 'file', 'versions', "app-$app->id-version-" . time());

    $data = $request->only($fields);
    $data['status'] = $data['status'] ?? 'draft';

    $version = $app->versions()->create([
      ...$data,
      'file_id' => $file->name,
    ]);

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
    }

    return $this->apiSuccessResponse("Version updated successfully", [
      'item' => $version->fresh()->toArray(),
    ]);
  }

  public function destroy(App $app, Version $version)
  {
    $version->delete();

    return $this->apiSuccessResponse("Version deleted successfully");
  }
}
