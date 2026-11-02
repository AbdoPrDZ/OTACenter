<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
  /**
   * SHA-256 of the stored file, so clients (devices, the store) can verify a
   * download is complete and untampered.
   *
   * New rows get their checksum from `File::booted()`. This migration also
   * calculates it for every file that already exists. It is self-contained (no
   * App\Models\File) so later model changes cannot break it, and it streams each
   * file with hash_file() so large APKs are not loaded into memory. A row whose
   * file is missing from disk keeps `null`.
   */
  public function up(): void
  {
    Schema::table('files', function (Blueprint $table) {
      $table->string('checksum', 64)->nullable()->after('path');
    });

    $this->backfill();
  }

  public function down(): void
  {
    Schema::table('files', function (Blueprint $table) {
      $table->dropColumn('checksum');
    });
  }

  private function backfill(): void
  {
    $done = 0;
    $missing = 0;

    DB::table('files')
      ->whereNull('checksum')
      ->orderBy('name')
      ->chunk(200, function ($rows) use (&$done, &$missing) {
        foreach ($rows as $row) {
          $checksum = $this->checksumOf($row->disk, $row->path);

          if ($checksum === null) {
            $missing++;
            continue;
          }

          DB::table('files')->where('name', $row->name)->update(['checksum' => $checksum]);
          $done++;
        }
      });

    if ($done || $missing)
      Log::info("files.checksum backfill: {$done} calculated, {$missing} skipped (file missing on disk)");
  }

  private function checksumOf(?string $disk, ?string $path): ?string
  {
    if (!$path) return null;

    try {
      $storage = Storage::disk($disk ?: 'public');

      if (!$storage->exists($path)) return null;

      $hash = hash_file('sha256', $storage->path($path));

      return $hash === false ? null : $hash;
    } catch (\Throwable) {
      # Unknown disk (the `admin`/`api` enum values have no configured disk).
      return null;
    }
  }
};
