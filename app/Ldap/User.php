<?php

namespace App\Ldap;

use LdapRecord\Models\Model;

class User extends Model
{
  /**
   * The object classes of the LDAP model.
   */
  public static array $objectClasses = [
    'user',
  ];

  /**
   * The attributes that should be mutated to dates.
   */
  protected array $dates = [
    'lastlogon',
    'lastlogontimestamp',
    'pwdlastset',
    'lockouttime',
    'accountexpires',
    'badpasswordtime',
  ];
}
