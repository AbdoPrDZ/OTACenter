<?php

namespace App\Src;

use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Storage;

class Controller extends BaseController
{
  use AuthorizesRequests, ValidatesRequests;

  /**
   * Create api response
   *
   * @param boolean $success
   * @param string $message
   * @param array $data
   * @param int $code
   * @return \Illuminate\Http\JsonResponse
   */
  public static function apiResponse(bool $success, string $message, array $data = [], int $code = 200)
  {
    return response()->json([
      'success' => $success,
      'message' => $message,
      ...$data,
    ], $code);
  }

  /**
   * Create success api response
   *
   * @param string $message
   * @param array $data
   * @param int $code
   * @return \Illuminate\Http\JsonResponse
   */
  public static function apiSuccessResponse(string $message, array $data = [], int $code = 200)
  {
    return self::apiResponse(true, $message, $data, $code);
  }

  /**
   * Create error api response
   *
   * @param string $message
   * @param array $data
   * @param int $code
   * @return \Illuminate\Http\JsonResponse
   */
  public static function apiErrorResponse(string $message, array $data = [], int $code = 400)
  {
    return self::apiResponse(false, $message, $data, $code);
  }

  /**
   * Create invalid values error response
   *
   * @param array $errors
   * @param array $data
   * @param int $code
   * @return \Illuminate\Http\JsonResponse
   */
  public static function apiInvalidValuesResponse(array $errors = [], ?string $message = null, array $data = [], int $code = 400)
  {
    foreach ($errors as $key => $value)
      if (is_array($value))
        $errors[$key] = isset($value[0]) ? $value[0] : '';

    if (!$message && count($errors) == 1)
      $message = array_values($errors)[0];

    return self::apiErrorResponse($message ?? "Invalid credentials", [
      ...$data,
      "errors" => $errors,
    ], $code);
  }

  /**
   * Create single error api response
   *
   * @param string $field
   * @param string $message
   * @param array $data
   * @param int $code
   * @return \Illuminate\Http\JsonResponse
   */
  public static function apiSingleErrorResponse(string $field, string $message, array $data = [], int $code = 400)
  {
    return self::apiInvalidValuesResponse([$field => $message], $message, $data, $code);
  }

  /**
   * moveFile - move the file to storage and create a file record
   *
   * @param Request $request
   * @param string $field request field
   * @param string $dirPath storage directory path
   * @param string $name file name
   * @return File the file record
   */
  public static function moveFile(Request $request, string $field, string $dirPath, string $name)
  {
    $pathArray = explode('/', $dirPath); // split the path
    $pathArray = array_filter($pathArray); // remove empty strings

    $nDirPath = null; // new dir path
    foreach ($pathArray as $item) {
      $nDirPath = $nDirPath ? "$nDirPath/$item" : $item; // create the new dir path
      if (!Storage::disk('public')->exists($nDirPath)) // check if directory is exists
        Storage::disk('public')->makeDirectory($nDirPath); // make it it
    }

    // get the request file
    $reqFile = $request->file($field);

    // check if the file is exists
    if (!$reqFile)
      throw new \Exception("Undefined file with name $field, on request $request");
    // check the file type
    elseif (get_class($reqFile) != \Illuminate\Http\UploadedFile::class)
      throw new \Exception("Unexpected file type, the file type must be \\Illuminate\\Http\\UploadedFile but " . get_class($reqFile) . " given");

    $fileName = $name . '.' . $reqFile->getClientOriginalExtension(); // create file name

    // move the uploaded image to dir
    $reqFile->move(Storage::disk("public")->path($nDirPath), $fileName);

    // create file row
    $file = File::create([
      'name' => $name,
      'path' => "$nDirPath/$fileName",
    ]);

    return $file;
  }

  public static function moveBase64File(Request $request, string $field, string $dirPath, string $name)
  {
    $base64 = $request->input($field);
    if (!$base64)
      throw new \Exception("Undefined file with name $field, on request $request");

    return self::createBase64File($base64, $dirPath, $name);
  }

  public static function createBase64File($base64, string $dirPath, string $name)
  {
    $pathArray = explode('/', $dirPath); // split the path
    $pathArray = array_filter($pathArray); // remove empty strings

    $nDirPath = null; // new dir path
    foreach ($pathArray as $item) {
      $nDirPath = $nDirPath ? "$nDirPath/$item" : $item; // create the new dir path
      if (!Storage::disk('public')->exists($nDirPath)) // check if directory is exists
        Storage::disk('public')->makeDirectory($nDirPath); // make it it
    }

    // decode the base64 string
    $data = base64_decode($base64);

    // get the file extension
    preg_match('/^data:(.*?);base64,/', $base64, $matches);

    // save the file to storage
    Storage::disk('public')->put("$nDirPath/$name", $data);

    // create file row
    $file = File::create([
      'name' => $name,
      'path' => "$nDirPath/$name",
    ]);

    return $file;
  }

  public static function wantsJson()
  {
    $acceptable = request()->getAcceptableContentTypes();

    return isset($acceptable[0]) && $acceptable[0] == 'application/json';
  }
}
