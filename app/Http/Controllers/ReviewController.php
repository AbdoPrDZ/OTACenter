<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Log;
use App\Models\Review;
use App\Src\Controller;
use App\Src\ValidationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
  /** Global review list (dashboard). */
  public function index(Request $request)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 12]);

    return Review::tablingCollect(
      $request,
      load: ['user', 'app'],
      selects: ['reviews.*'],
    );
  }

  /** Reviews for one app. */
  public function indexByApp(Request $request, App $app)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 12]);

    return Review::tablingCollect(
      $request,
      load: ['user'],
      selects: ['reviews.*'],
      query: Review::query()->where('app_id', $app->id),
    );
  }

  /** The current user's review for an app (or null). */
  public function mine(Request $request, App $app)
  {
    $review = Review::query()
      ->where('app_id', $app->id)
      ->where('user_id', $request->user()->id)
      ->first();

    return $this->apiSuccessResponse("Review retrieved successfully", [
      'item' => $review?->load('user', 'app')->toArray(),
    ]);
  }

  /** Create or replace the current user's review (one per user per app). */
  public function store(Request $request, App $app)
  {
    $validator = Validator::make($request->all(), Review::validationRules(ValidationType::Create));

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $user = $request->user();

    // One review per user per app, enforced by a DB unique index. A soft-deleted
    // review still occupies that slot, so reuse and restore it instead of
    // inserting (which would violate the constraint).
    $review = Review::withTrashed()
      ->where('app_id', $app->id)
      ->where('user_id', $user->id)
      ->first();

    if ($review) {
      if ($review->trashed()) {
        $review->restore();
      }

      $review->fill([
        'rating'  => (int) $request->input('rating'),
        'title'   => $request->input('title'),
        'comment' => $request->input('comment'),
        'status'  => 'published',
      ])->save();
    } else {
      $review = Review::create([
        'app_id'  => $app->id,
        'user_id' => $user->id,
        'rating'  => (int) $request->input('rating'),
        'title'   => $request->input('title'),
        'comment' => $request->input('comment'),
        'status'  => 'published',
      ]);
    }

    Log::record(
      'review.created',
      "Reviewed {$app->name}",
      [$review, $app, $user],
      ['rating' => (int) $review->rating],
    );

    return $this->apiSuccessResponse("Review saved successfully", [
      'item' => $review->load('user', 'app')->toArray(),
    ]);
  }

  public function update(Request $request, App $app, Review $review)
  {
    if (!$this->mayManage($request, $review, 'review.update'))
      return $this->apiErrorResponse("Forbidden", [], 403);

    $validator = Validator::make($request->all(), Review::validationRules(ValidationType::Update, $review));

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $review->update($request->only(['rating', 'title', 'comment']));

    return $this->apiSuccessResponse("Review updated successfully", [
      'item' => $review->fresh()->load('user', 'app')->toArray(),
    ]);
  }

  public function destroy(Request $request, App $app, Review $review)
  {
    if (!$this->mayManage($request, $review, 'review.delete'))
      return $this->apiErrorResponse("Forbidden", [], 403);

    $review->delete();

    return $this->apiSuccessResponse("Review deleted successfully");
  }

  /** Approve or reject a review. */
  public function moderate(Request $request, App $app, Review $review)
  {
    $validator = Validator::make($request->all(), ['status' => 'required|in:published,rejected']);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $review->update(['status' => $request->input('status')]);

    Log::record(
      'review.moderated',
      "Review {$review->status}",
      [$review, $app, $request->user()],
      ['status' => $review->status],
    );

    return $this->apiSuccessResponse("Review moderated successfully", [
      'item' => $review->load('user', 'app')->toArray(),
    ]);
  }

  /** The owner may always manage their own review; others need the permission. */
  private function mayManage(Request $request, Review $review, string $permission): bool
  {
    $user = $request->user();

    return $review->user_id === $user->id || $user->can($permission);
  }
}
