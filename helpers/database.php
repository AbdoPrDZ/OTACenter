<?php

use Illuminate\Database\Query\Expression;

if (!function_exists('json_default_object')) {
  function json_default_object(): Expression
  {
    $driver = DB::getDriverName();

    return match ($driver) {
      'pgsql' => new Expression("'{}'::json"),
      'mysql' => new Expression('(JSON_OBJECT())'),
      default => new Expression("'{}'"),
    };
  }
}

if (!function_exists('json_default_array')) {
  function json_default_array(): Expression
  {
    $driver = DB::getDriverName();

    return match ($driver) {
      'pgsql' => new Expression("'[]'::json"),
      'mysql' => new Expression('(JSON_ARRAY())'),
      default => new Expression("'[]'"),
    };
  }
}
