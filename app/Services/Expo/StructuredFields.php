<?php

namespace App\Services\Expo;

/**
 * Minimal Structured Field Values (RFC 8941) dictionary support, as used by
 * expo-updates headers (`Expo-Extra-Params`, `expo-expect-signature`,
 * `expo-signature`).
 *
 * Only what those headers carry is supported: string, token, integer, decimal
 * and boolean bare items. Parameters (`;a=b`) are skipped, inner lists ignored.
 */
class StructuredFields
{
  /** @return array<string, string|int|float|bool> */
  public static function parseDictionary(?string $input): array
  {
    $input = (string) $input;
    $length = strlen($input);
    $pos = 0;
    $result = [];

    while ($pos < $length) {
      self::skipSpaces($input, $pos);
      if ($pos >= $length) break;

      if (!preg_match('/\G[a-z*][a-z0-9_\-.*]*/', $input, $m, 0, $pos)) return $result;
      $key = $m[0];
      $pos += strlen($key);

      $value = true;
      if ($pos < $length && $input[$pos] === '=') {
        $pos++;
        $value = self::parseBareItem($input, $pos);
        if ($value === null) return $result;
      }

      # Parameters of the member: `;name=value` pairs, ignored.
      while ($pos < $length && $input[$pos] === ';') {
        $pos++;
        if (!preg_match('/\G\s*[a-z*][a-z0-9_\-.*]*/', $input, $m, 0, $pos)) return $result;
        $pos += strlen($m[0]);
        if ($pos < $length && $input[$pos] === '=') {
          $pos++;
          if (self::parseBareItem($input, $pos) === null) return $result;
        }
      }

      $result[$key] = $value;

      self::skipSpaces($input, $pos);
      if ($pos >= $length) break;
      if ($input[$pos] !== ',') return $result;
      $pos++;
    }

    return $result;
  }

  /** @param array<string, string|int|bool> $values strings are serialized as sf-strings */
  public static function serializeDictionary(array $values): string
  {
    $members = [];

    foreach ($values as $key => $value) {
      if ($value === true) {
        $members[] = $key;
      } elseif ($value === false) {
        $members[] = "$key=?0";
      } elseif (is_int($value)) {
        $members[] = "$key=$value";
      } else {
        $members[] = $key . '="' . addcslashes((string) $value, '"\\') . '"';
      }
    }

    return implode(', ', $members);
  }

  private static function parseBareItem(string $input, int &$pos): string|int|float|bool|null
  {
    $length = strlen($input);
    if ($pos >= $length) return null;

    $char = $input[$pos];

    if ($char === '"') {
      $pos++;
      $out = '';
      while ($pos < $length) {
        $c = $input[$pos++];
        if ($c === '\\') {
          if ($pos >= $length) return null;
          $out .= $input[$pos++];
        } elseif ($c === '"') {
          return $out;
        } else {
          $out .= $c;
        }
      }
      return null;
    }

    if ($char === '?') {
      $flag = $input[$pos + 1] ?? '';
      if ($flag !== '0' && $flag !== '1') return null;
      $pos += 2;
      return $flag === '1';
    }

    if (preg_match('/\G-?\d+(\.\d+)?/', $input, $m, 0, $pos)) {
      $pos += strlen($m[0]);
      return isset($m[1]) ? (float) $m[0] : (int) $m[0];
    }

    if (preg_match('/\G[A-Za-z*][A-Za-z0-9!#$%&\'*+\-.^_`|~:\/]*/', $input, $m, 0, $pos)) {
      $pos += strlen($m[0]);
      return $m[0];
    }

    return null;
  }

  private static function skipSpaces(string $input, int &$pos): void
  {
    while ($pos < strlen($input) && ($input[$pos] === ' ' || $input[$pos] === "\t")) $pos++;
  }
}
