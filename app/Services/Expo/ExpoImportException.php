<?php

namespace App\Services\Expo;

/** An Expo export upload that cannot be published; `field` names the form field to blame. */
class ExpoImportException extends \RuntimeException
{
  public function __construct(string $message, public readonly string $field = 'file')
  {
    parent::__construct($message);
  }
}
