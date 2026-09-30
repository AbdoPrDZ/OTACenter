<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\AppDomain;
use App\Models\Domain;
use App\Models\User;
use App\Models\UserDomain;
use App\Src\Controller;
use App\Src\ValidationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DomainController extends Controller
{
  public function index(Request $request)
  {
    return Domain::tablingCollect(
      $request,
      selects: ['domains.*'],
    );
  }

  public function show(Domain $domain)
  {
    return $this->apiSuccessResponse("Domain retrieved successfully", [
      'item' => $domain->toArray(),
    ]);
  }

  public function store(Request $request)
  {
    $rules = Domain::validationRules(ValidationType::Create);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $fields = array_diff(array_keys($rules), ['image']);
    $domain = Domain::create($request->only($fields));

    if ($request->hasFile('image')) {
      $image = $this->moveFile($request, 'image', 'apps', "app-$domain->id-image-" . time());
      $domain->update(['image_id' => $image->name]);
    }

    return $this->apiSuccessResponse("Domain created successfully", [
      'item' => $domain->toArray(),
    ]);
  }

  public function update(Request $request, Domain $domain)
  {
    $rules = Domain::validationRules(ValidationType::Update, $domain);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $fields = array_diff(array_keys($rules), ['image']);
    $domain->update($request->only($fields));

    if ($request->hasFile('image')) {
      $image = $this->moveFile($request, 'image', 'apps', "app-$domain->id-image-" . time());
      $domain->update(['image_id' => $image->name]);
    }

    return $this->apiSuccessResponse("Domain updated successfully", [
      'item' => $domain->toArray(),
    ]);
  }

  public function destroy(Domain $domain)
  {
    $domain->delete();

    return $this->apiSuccessResponse("Domain deleted successfully");
  }

  public function indexByUser(Request $request, User $user)
  {
    return UserDomain::tablingCollect(
      $request,
      selects: ['domain.*'],
      load: ['domain'],
      relations: ['domain'],
      query: UserDomain::query()->where('user_id', $user->id),
    );
  }

  public function bindUser(Request $request, User $user, Domain $domain)
  {
    if (UserDomain::where('user_id', $user->id)->where('domain_id', $domain->id)->exists()) {
      return $this->apiSuccessResponse("Domain is already bound to user");
    }

    UserDomain::firstOrCreate([
      'user_id' => $user->id,
      'domain_id' => $domain->id,
    ]);

    return $this->apiSuccessResponse("Domain bound to user successfully");
  }

  public function unbindUser(Request $request, User $user, Domain $domain)
  {
    if (!UserDomain::where('user_id', $user->id)->where('domain_id', $domain->id)->exists()) {
      return $this->apiSuccessResponse("Domain is not bound to user");
    }

    UserDomain::where('user_id', $user->id)
      ->where('domain_id', $domain->id)
      ->delete();

    return $this->apiSuccessResponse("Domain unbound from user successfully");
  }

  public function indexByApp(Request $request, App $app)
  {
    return AppDomain::tablingCollect(
      $request,
      selects: ['domain.*'],
      load: ['domain'],
      relations: ['domain'],
      query: AppDomain::query()->where('app_id', $app->id),
    );
  }

  public function bindApp(Request $request, App $app, Domain $domain)
  {
    if (AppDomain::where('app_id', $app->id)->where('domain_id', $domain->id)->exists()) {
      return $this->apiSuccessResponse("Domain is already bound to app");
    }

    AppDomain::firstOrCreate([
      'app_id' => $app->id,
      'domain_id' => $domain->id,
    ]);

    return $this->apiSuccessResponse("Domain bound to app successfully");
  }

  public function unbindApp(Request $request, App $app, Domain $domain)
  {
    if (!AppDomain::where('app_id', $app->id)->where('domain_id', $domain->id)->exists()) {
      return $this->apiSuccessResponse("Domain is not bound to app");
    }

    AppDomain::where('app_id', $app->id)
      ->where('domain_id', $domain->id)
      ->delete();

    return $this->apiSuccessResponse("Domain unbound from app successfully");
  }

}
